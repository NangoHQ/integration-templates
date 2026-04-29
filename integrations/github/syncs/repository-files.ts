import { createSync } from 'nango';
import * as z from 'zod';

// Provider schemas matching GitHub API response structure
const GitRefObjectSchema = z.object({
    type: z.string(),
    sha: z.string(),
    url: z.string()
});

const GitReferenceSchema = z.object({
    ref: z.string(),
    node_id: z.string(),
    url: z.string(),
    object: GitRefObjectSchema
});

const GitTreeEntrySchema = z.object({
    path: z.string(),
    mode: z.string(),
    type: z.string(),
    sha: z.string(),
    size: z.number().optional(),
    url: z.string().optional()
});

const GitTreeSchema = z.object({
    sha: z.string(),
    url: z.string().optional(),
    truncated: z.boolean(),
    tree: z.array(GitTreeEntrySchema)
});

const MetadataSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string()
});

const FileMetadataSchema = z.object({
    id: z.string(),
    path: z.string(),
    sha: z.string(),
    type: z.enum(['blob', 'tree', 'commit']),
    mode: z.string(),
    size: z.number().optional()
});

// Checkpoint fields must be required (not optional) and can only be string, number, or boolean
const CheckpointSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    branch: z.string(),
    last_tree_sha: z.string()
});

const sync = createSync({
    description: 'Sync file metadata for a specific repository branch using the Git trees API recursively',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/repository-files' }],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        FileMetadata: FileMetadataSchema
    },

    exec: async (nango) => {
        // Read and validate metadata for owner, repo, branch
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);

        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')}`);
        }

        const { owner, repo, branch } = metadataResult.data;

        // Get checkpoint from previous run
        const checkpoint = await nango.getCheckpoint();

        // Step 1: Resolve the branch to get the current tree SHA
        // https://docs.github.com/en/rest/git/refs#get-a-reference
        const refResponse = await nango.get({
            endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branch)}`,
            retries: 3
        });

        const refResult = GitReferenceSchema.safeParse(refResponse.data);

        if (!refResult.success) {
            throw new Error(`Failed to parse Git reference response: ${refResult.error.message}`);
        }

        const reference = refResult.data;

        if (reference.object.type !== 'commit') {
            throw new Error(`Expected reference object type 'commit', got '${reference.object.type}'`);
        }

        const commitSha = reference.object.sha;

        // Step 2: Get the commit to find the tree SHA
        // https://docs.github.com/en/rest/git/commits#get-a-commit
        const commitResponse = await nango.get({
            endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits/${encodeURIComponent(commitSha)}`,
            retries: 3
        });

        const commitTreeSha = z
            .object({
                tree: z.object({
                    sha: z.string()
                })
            })
            .safeParse(commitResponse.data);

        if (!commitTreeSha.success) {
            throw new Error(`Failed to parse commit response: ${commitTreeSha.error.message}`);
        }

        const currentTreeSha = commitTreeSha.data.tree.sha;

        // If tree SHA hasn't changed and metadata matches, nothing to do
        if (
            checkpoint &&
            checkpoint['last_tree_sha'] === currentTreeSha &&
            checkpoint['owner'] === owner &&
            checkpoint['repo'] === repo &&
            checkpoint['branch'] === branch
        ) {
            return;
        }

        // Tree has changed or this is first run - fetch full tree recursively
        // Start delete tracking since we're doing a full refresh
        await nango.trackDeletesStart('FileMetadata');

        // Step 3: Fetch the recursive tree
        // https://docs.github.com/en/rest/git/trees#get-a-tree
        const treeResponse = await nango.get({
            endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(currentTreeSha)}`,
            params: {
                recursive: '1'
            },
            retries: 3
        });

        const treeResult = GitTreeSchema.safeParse(treeResponse.data);

        if (!treeResult.success) {
            throw new Error(`Failed to parse tree response: ${treeResult.error.message}`);
        }

        const tree = treeResult.data;

        if (tree.truncated) {
            throw new Error('Tree response was truncated. Repository exceeds GitHub API limits (100,000 entries or 7 MB).');
        }

        // Transform tree entries to file metadata records
        const fileRecords = tree.tree
            .filter((entry) => entry.type === 'blob')
            .map((entry) => ({
                id: `${owner}/${repo}/${branch}:${entry.path}`,
                path: entry.path,
                sha: entry.sha,
                type: entry.type,
                mode: entry.mode,
                ...(entry.size !== undefined && { size: entry.size })
            }));

        if (fileRecords.length > 0) {
            await nango.batchSave(fileRecords, 'FileMetadata');
        }

        // Mark deletions as complete - files not in current tree will be deleted
        await nango.trackDeletesEnd('FileMetadata');

        // Save checkpoint for next run
        await nango.saveCheckpoint({
            owner,
            repo,
            branch,
            last_tree_sha: currentTreeSha
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
