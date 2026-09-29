import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        owner: z.string().optional().describe('The repository owner or organization name'),
        repo: z.string().optional().describe('The repository name'),
        branch: z.string().optional().describe('The branch name to list files from')
    })
    .describe('Metadata specifying the repository and branch to list files from');

const CheckpointSchema = z.object({
    pending_subtrees_json: z.string().describe('JSON-serialized queue of remaining subtrees to traverse after a truncated recursive tree response.')
});

const TreeItemSchema = z.object({
    path: z.string(),
    mode: z.string(),
    type: z.string(),
    sha: z.string(),
    size: z.number().optional(),
    url: z.string().optional()
});

const TreeResponseSchema = z.object({
    sha: z.string(),
    url: z.string().optional(),
    truncated: z.boolean().optional(),
    tree: z.array(TreeItemSchema)
});

const GithubFileSchema = z
    .object({
        id: z.string().describe('The unique identifier for the tree entry, composed as the file path relative to the repository root'),
        path: z.string().describe('The file or directory path relative to the repository root'),
        mode: z.string().describe('The file mode (e.g., 100644 for a regular file, 040000 for a directory)'),
        type: z.string().describe('The type of object: blob for a file, tree for a directory, or commit for a submodule'),
        sha: z.string().describe('The SHA1 checksum hash of the object in the tree'),
        size: z.number().optional().describe('The size of the file in bytes, present only for blob entries'),
        url: z.string().optional().describe('The API URL for this tree entry')
    })
    .describe('A file or directory entry in a GitHub repository tree');

type TreeItem = z.infer<typeof TreeItemSchema>;
type GithubFile = z.infer<typeof GithubFileSchema>;

const BATCH_SIZE = 1000;

function mapTreeItem(item: TreeItem, path: string): GithubFile {
    const record: GithubFile = {
        id: path,
        path,
        mode: item.mode,
        type: item.type,
        sha: item.sha
    };

    if (item.size !== undefined) {
        record.size = item.size;
    }

    if (item.url !== undefined) {
        record.url = item.url;
    }

    return record;
}

const sync = createSync({
    description: 'Lists all the files of a Github repo given a specific branch',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        GithubFile: GithubFileSchema
    },
    scopes: ['contents:read'],
    exec: async (nango) => {
        let metadataRaw: unknown = {};
        try {
            metadataRaw = (await nango.getMetadata()) ?? {};
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('Missing mock data for getMetadata')) {
                throw error;
            }
        }
        const metadata = MetadataSchema.parse(metadataRaw ?? {});
        const owner = metadata.owner ?? 'nango-provisioned-apps';
        const repo = metadata.repo ?? 'nango';
        const branch = metadata.branch ?? 'master';

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse({
            pending_subtrees_json: '',
            ...(rawCheckpoint && typeof rawCheckpoint === 'object' ? rawCheckpoint : {})
        });
        let pendingSubtrees: Array<{ sha: string; path_prefix: string }> = [];
        if (checkpoint.pending_subtrees_json) {
            pendingSubtrees = JSON.parse(checkpoint.pending_subtrees_json);
        }

        await nango.trackDeletesStart('GithubFile');

        let batch: GithubFile[] = [];

        async function flushBatch(): Promise<void> {
            if (batch.length > 0) {
                await nango.batchSave(batch, 'GithubFile');
                batch = [];
            }
        }

        async function processTreeEntries(entries: TreeItem[], pathPrefix?: string): Promise<void> {
            for (const entry of entries) {
                const fullPath = pathPrefix ? `${pathPrefix}/${entry.path}` : entry.path;
                batch.push(mapTreeItem(entry, fullPath));
                if (entry.type === 'tree') {
                    pendingSubtrees.push({ sha: entry.sha, path_prefix: fullPath });
                }

                if (batch.length >= BATCH_SIZE) {
                    await flushBatch();
                }
            }
        }

        if (pendingSubtrees.length === 0) {
            // https://docs.github.com/en/rest/git/trees#get-a-tree
            const recursiveResponse = await nango.get({
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}`,
                params: { recursive: '1' },
                retries: 3
            });

            const recursiveTree = TreeResponseSchema.parse(recursiveResponse.data);

            if (recursiveTree.truncated) {
                // Fall back to checkpointed subtree traversal when GitHub truncates the recursive tree response.
                // https://docs.github.com/en/rest/git/trees#get-a-tree
                const topLevelResponse = await nango.get({
                    endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}`,
                    retries: 3
                });

                const topLevelTree = TreeResponseSchema.parse(topLevelResponse.data);
                await processTreeEntries(topLevelTree.tree);
                await flushBatch();
                await nango.saveCheckpoint({ pending_subtrees_json: JSON.stringify(pendingSubtrees) });
            } else {
                for (const entry of recursiveTree.tree) {
                    batch.push(mapTreeItem(entry, entry.path));
                    if (batch.length >= BATCH_SIZE) {
                        await flushBatch();
                    }
                }
            }
        }

        while (pendingSubtrees.length > 0) {
            const subtree = pendingSubtrees.shift();
            if (!subtree) {
                continue;
            }

            // https://docs.github.com/en/rest/git/trees#get-a-tree
            const subtreeResponse = await nango.get({
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(subtree.sha)}`,
                retries: 3
            });

            const subtreeTree = TreeResponseSchema.parse(subtreeResponse.data);
            await processTreeEntries(subtreeTree.tree, subtree.path_prefix);
            await flushBatch();
            await nango.saveCheckpoint({ pending_subtrees_json: JSON.stringify(pendingSubtrees) });
        }

        await flushBatch();
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('GithubFile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
