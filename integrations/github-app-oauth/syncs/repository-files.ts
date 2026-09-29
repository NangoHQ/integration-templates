import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        owner: z.string().optional().describe('Repository owner, either a user login or an organization name.'),
        repo: z.string().optional().describe('Repository name.'),
        branch: z.string().optional().describe('Branch name to resolve the current commit and tree from.')
    })
    .describe('Metadata to identify which repository and branch to sync file metadata from. Defaults to the seeded test repository when omitted.');

const CheckpointSchema = z
    .object({
        pending_subtrees_json: z
            .string()
            .describe('JSON-serialized queue of remaining subtrees to traverse when the initial recursive tree response is truncated.')
    })
    .describe('Resume state for manual subtree traversal if the GitHub Trees API truncates the recursive response.');

const TreeEntrySchema = z.object({
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
    tree: z.array(TreeEntrySchema),
    truncated: z.boolean().optional()
});

const RepositoryFileSchema = z
    .object({
        id: z.string().describe('Stable record identifier using the full repository path, so renames are surfaced as deletions and new records.'),
        path: z.string().describe('Full path of the entry within the repository tree, relative to the branch root.'),
        sha: z.string().describe('Git object SHA. For files this is the blob SHA; for directories it is the tree SHA.'),
        mode: z.string().describe('File mode as a six-character octal string (e.g., 100644 for a regular file, 040000 for a directory).'),
        type: z.string().describe('Git object type. "blob" indicates a file; "tree" indicates a directory.'),
        size: z.number().optional().describe('Size of the object in bytes. Present only for blob entries; omitted for directories.')
    })
    .describe('A single entry from the Git repository tree, representing either a file or a directory.');

type TreeEntry = z.infer<typeof TreeEntrySchema>;
type RepositoryFile = z.infer<typeof RepositoryFileSchema>;
type PendingSubtree = { sha: string; path_prefix: string };

function mapTreeEntry(entry: TreeEntry, fullPath: string): RepositoryFile {
    const record: RepositoryFile = {
        id: fullPath,
        path: fullPath,
        sha: entry.sha,
        mode: entry.mode,
        type: entry.type
    };
    if (entry.size !== undefined) {
        record.size = entry.size;
    }
    return record;
}

const BATCH_SIZE = 1000;

const sync = createSync({
    description: 'Sync file metadata for a specific repository branch.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        RepositoryFile: RepositoryFileSchema
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
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { pending_subtrees_json: '' });

        await nango.trackDeletesStart('RepositoryFile');

        const owner = metadata.owner ?? 'nango-provisioned-apps';
        const repo = metadata.repo ?? 'nango';
        const branch = metadata.branch ?? 'master';

        let batch: RepositoryFile[] = [];
        let pendingSubtrees: PendingSubtree[] = [];
        if (checkpoint.pending_subtrees_json) {
            pendingSubtrees = JSON.parse(checkpoint.pending_subtrees_json);
        }

        async function flushBatch(): Promise<void> {
            if (batch.length > 0) {
                await nango.batchSave(batch, 'RepositoryFile');
                batch = [];
            }
        }

        async function processTreeEntries(entries: TreeEntry[], pathPrefix?: string): Promise<void> {
            for (const entry of entries) {
                const fullPath = pathPrefix ? `${pathPrefix}/${entry.path}` : entry.path;
                batch.push(mapTreeEntry(entry, fullPath));
                if (entry.type === 'tree') {
                    pendingSubtrees.push({ sha: entry.sha, path_prefix: fullPath });
                }

                if (batch.length >= BATCH_SIZE) {
                    await flushBatch();
                }
            }
        }

        if (pendingSubtrees.length === 0) {
            // https://docs.github.com/rest/git/trees#get-a-tree
            const recursiveResponse = await nango.get({
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}`,
                params: { recursive: '1' },
                retries: 3
            });

            const recursiveTree = TreeResponseSchema.parse(recursiveResponse.data);

            if (recursiveTree.truncated) {
                // Fallback to manual traversal because the recursive response was truncated.
                // https://docs.github.com/rest/git/trees#get-a-tree
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
                    batch.push(mapTreeEntry(entry, entry.path));
                    if (batch.length >= BATCH_SIZE) {
                        await flushBatch();
                    }
                }
            }
        }

        while (pendingSubtrees.length > 0) {
            const subtree = pendingSubtrees.shift();
            if (subtree === undefined) {
                continue;
            }

            // https://docs.github.com/rest/git/trees#get-a-tree
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
        await nango.trackDeletesEnd('RepositoryFile');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
