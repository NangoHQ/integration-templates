import { createSync } from 'nango';
import { z } from 'zod';

const PullRequestSchema = z.object({
    pullRequestId: z.number(),
    status: z.string(),
    title: z.string(),
    description: z.string().optional(),
    createdBy: z.object({
        displayName: z.string(),
        id: z.string()
    }),
    creationDate: z.string(),
    sourceRefName: z.string(),
    targetRefName: z.string(),
    mergeStatus: z.string().optional(),
    isDraft: z.boolean().optional(),
    reviewers: z
        .array(
            z.object({
                displayName: z.string().optional(),
                id: z.string().optional(),
                vote: z.number().optional()
            })
        )
        .optional(),
    repository: z.object({
        id: z.string(),
        name: z.string(),
        project: z.object({
            id: z.string(),
            name: z.string()
        })
    })
});

const PullRequestListResponseSchema = z.object({
    value: z.array(PullRequestSchema).optional()
});

const RepositorySchema = z.object({
    id: z.string(),
    name: z.string(),
    project: z.object({
        id: z.string(),
        name: z.string()
    })
});

const RepositoryListResponseSchema = z.object({
    value: z.array(RepositorySchema).optional()
});

const RecordSchema = z.object({
    id: z.string(),
    pullRequestId: z.number(),
    status: z.string(),
    title: z.string(),
    description: z.string().optional(),
    createdByDisplayName: z.string(),
    createdById: z.string(),
    creationDate: z.string(),
    sourceRefName: z.string(),
    targetRefName: z.string(),
    mergeStatus: z.string().optional(),
    isDraft: z.boolean().optional(),
    repositoryId: z.string(),
    repositoryName: z.string(),
    projectId: z.string(),
    projectName: z.string()
});

const CheckpointSchema = z.object({
    minTime: z.string(),
    fullCrawlDone: z.boolean()
});

const sync = createSync({
    description: 'Sync pull requests across repositories with incremental status and date filtering',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PullRequest: RecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint ?? { minTime: '', fullCrawlDone: false });
        const currentCheckpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { minTime: '', fullCrawlDone: false };
        const shouldRunFullCrawl = !currentCheckpoint.fullCrawlDone;
        const minTime = shouldRunFullCrawl ? '' : currentCheckpoint.minTime;
        let maxCreationDate = currentCheckpoint.minTime;

        // Only an unconstrained crawl can safely drive delete tracking.
        if (shouldRunFullCrawl) {
            await nango.trackDeletesStart('PullRequest');
        }

        // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories/list
        const reposResponse = await nango.get({
            endpoint: '/_apis/git/repositories',
            params: {
                'api-version': '7.2-preview.1'
            },
            retries: 3
        });

        const reposData = RepositoryListResponseSchema.parse(reposResponse.data);
        const repos = reposData.value || [];

        const mapPR = (pr: z.infer<typeof PullRequestSchema>): z.infer<typeof RecordSchema> => ({
            id: String(pr.pullRequestId),
            pullRequestId: pr.pullRequestId,
            status: pr.status,
            title: pr.title,
            description: pr.description,
            createdByDisplayName: pr.createdBy.displayName,
            createdById: pr.createdBy.id,
            creationDate: pr.creationDate,
            sourceRefName: pr.sourceRefName,
            targetRefName: pr.targetRefName,
            mergeStatus: pr.mergeStatus,
            isDraft: pr.isDraft,
            repositoryId: pr.repository.id,
            repositoryName: pr.repository.name,
            projectId: pr.repository.project.id,
            projectName: pr.repository.project.name
        });

        if (repos.length > 0) {
            for (const repo of repos) {
                const projectName = repo.project.name;
                const repoId = repo.id;

                // On incremental runs, re-fetch all active PRs first so that status/mergeStatus
                // updates to existing PRs are not missed (minTime only filters by creationDate).
                if (!shouldRunFullCrawl) {
                    let activeContinuationToken: string | undefined;
                    do {
                        const activeResponse = await nango.get({
                            endpoint: `/${encodeURIComponent(projectName)}/_apis/git/repositories/${encodeURIComponent(repoId)}/pullrequests`,
                            params: {
                                'searchCriteria.status': 'active',
                                'api-version': '7.2-preview.1',
                                ...(activeContinuationToken && { continuationToken: activeContinuationToken }),
                                $top: '50'
                            },
                            retries: 3
                        });
                        const activePrData = PullRequestListResponseSchema.parse(activeResponse.data);
                        const activePrs = activePrData.value || [];
                        if (activePrs.length > 0) {
                            await nango.batchSave(activePrs.map(mapPR), 'PullRequest');
                        }
                        const rawActiveToken = activeResponse.headers['x-ms-continuationtoken'];
                        activeContinuationToken = typeof rawActiveToken === 'string' && rawActiveToken.trim() ? rawActiveToken.trim() : undefined;
                    } while (activeContinuationToken);
                }

                let continuationToken: string | undefined;

                do {
                    // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests/get-pull-requests
                    const response = await nango.get({
                        endpoint: `/${encodeURIComponent(projectName)}/_apis/git/repositories/${encodeURIComponent(repoId)}/pullrequests`,
                        params: {
                            'searchCriteria.status': 'all',
                            'api-version': '7.2-preview.1',
                            ...(minTime && { 'searchCriteria.minTime': minTime }),
                            ...(continuationToken && { continuationToken }),
                            $top: '50'
                        },
                        retries: 3
                    });

                    const prData = PullRequestListResponseSchema.parse(response.data);
                    const prs = prData.value || [];

                    if (prs.length === 0) {
                        break;
                    }

                    const records = prs.map((pr) => {
                        if (pr.creationDate > maxCreationDate) {
                            maxCreationDate = pr.creationDate;
                        }
                        return mapPR(pr);
                    });

                    await nango.batchSave(records, 'PullRequest');

                    const rawToken = response.headers['x-ms-continuationtoken'];
                    continuationToken = typeof rawToken === 'string' && rawToken.trim() ? rawToken.trim() : undefined;
                } while (continuationToken);
            }
        }

        if (shouldRunFullCrawl) {
            await nango.trackDeletesEnd('PullRequest');
        }

        await nango.saveCheckpoint({
            minTime: maxCreationDate,
            fullCrawlDone: true
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
