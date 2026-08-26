import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    repositories: z.array(
        z.object({
            project: z.string(),
            repositoryId: z.string()
        })
    )
});

const CreatorSchema = z
    .object({
        displayName: z.string().optional()
    })
    .passthrough();

const RefSchema = z
    .object({
        name: z.string(),
        objectId: z.string(),
        url: z.string().optional(),
        creator: CreatorSchema.optional()
    })
    .passthrough();

const RefsListResponseSchema = z
    .object({
        value: z.array(RefSchema)
    })
    .passthrough();

const BranchSchema = z.object({
    id: z.string(),
    name: z.string(),
    project: z.string(),
    repositoryId: z.string(),
    objectId: z.string().optional(),
    creator: z.string().optional(),
    url: z.string().optional()
});

const CheckpointSchema = z.object({
    repoIndex: z.number().int().nonnegative(),
    continuationToken: z.string()
});

const sync = createSync({
    description: 'Sync Git branches (refs/heads) across repositories',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Branch: BranchSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new Error('Invalid metadata: repositories array with project and repositoryId is required');
        }

        const repositories = parsedMetadata.data.repositories;

        if (repositories.length === 0) {
            throw new Error('At least one repository is required in metadata');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { repoIndex: 0, continuationToken: '' };

        // Blocker: The Azure DevOps Git refs API does not expose a modified-date filter,
        // changed-records endpoint, or resumable cursor for incremental sync.
        // Pagination uses a per-request continuationToken with no incremental filter.
        // This sync performs a full snapshot with delete tracking.
        await nango.trackDeletesStart('Branch');

        for (let i = checkpoint.repoIndex; i < repositories.length; i++) {
            const repo = repositories[i];

            if (!repo) {
                throw new Error('Repository index out of bounds');
            }

            if (!repo.project || !repo.repositoryId) {
                throw new Error('Each repository must have project and repositoryId');
            }

            let continuationToken: string | undefined = i === checkpoint.repoIndex && checkpoint.continuationToken ? checkpoint.continuationToken : undefined;

            do {
                const params: Record<string, string> = {
                    filter: 'heads/',
                    'api-version': '7.2-preview.1',
                    $top: '100'
                };

                if (continuationToken) {
                    params['continuationToken'] = continuationToken;
                }

                // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/refs/list?view=azure-devops-rest-7.2
                const response = await nango.get({
                    endpoint: `/${encodeURIComponent(repo.project)}/_apis/git/repositories/${encodeURIComponent(repo.repositoryId)}/refs`,
                    params,
                    retries: 3
                });

                const parsedResponse = RefsListResponseSchema.safeParse(response.data);

                if (!parsedResponse.success) {
                    throw new Error(`Failed to parse refs response for repository ${repo.repositoryId}: ${parsedResponse.error.message}`);
                }

                const branches = parsedResponse.data.value.map((ref) => {
                    return {
                        id: `${repo.project}/${repo.repositoryId}/${ref.name}`,
                        name: ref.name,
                        project: repo.project,
                        repositoryId: repo.repositoryId,
                        objectId: ref.objectId,
                        ...(ref.creator?.displayName !== undefined && { creator: ref.creator.displayName }),
                        ...(ref.url !== undefined && { url: ref.url })
                    };
                });

                if (branches.length > 0) {
                    await nango.batchSave(branches, 'Branch');
                }

                const rawNextToken = response.headers['x-ms-continuationtoken'];
                const nextToken = Array.isArray(rawNextToken) ? rawNextToken[0] : typeof rawNextToken === 'string' ? rawNextToken : undefined;

                if (nextToken) {
                    await nango.saveCheckpoint({ repoIndex: i, continuationToken: nextToken });
                    continuationToken = nextToken;
                } else {
                    await nango.saveCheckpoint({ repoIndex: i + 1, continuationToken: '' });
                    continuationToken = undefined;
                }
            } while (continuationToken);
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Branch');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
