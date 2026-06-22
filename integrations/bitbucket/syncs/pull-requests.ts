import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PullRequestSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    state: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    author_uuid: z.string().optional(),
    source_branch: z.string().optional(),
    destination_branch: z.string().optional(),
    comment_count: z.number().optional(),
    task_count: z.number().optional(),
    draft: z.boolean().optional(),
    mergeable: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const WorkspaceItemSchema = z.object({
    workspace: z.object({
        slug: z.string()
    })
});

const RepositoryItemSchema = z.object({
    slug: z.string()
});

const PullRequestItemSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    state: z.string().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    author: z
        .object({
            uuid: z.string().optional()
        })
        .optional(),
    source: z
        .object({
            branch: z
                .object({
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    destination: z
        .object({
            branch: z
                .object({
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    comment_count: z.number().optional(),
    task_count: z.number().optional(),
    draft: z.boolean().optional(),
    mergeable: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync pull requests per repository',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        PullRequest: PullRequestSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;
        const isFullRefresh = !updatedAfter;

        const workspaceProxyConfig: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-user-workspaces-get
            endpoint: '/2.0/user/workspaces',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pagelen',
                limit: 50,
                response_path: 'values'
            },
            retries: 3
        };

        const workspaceSlugs: string[] = [];
        for await (const workspaces of nango.paginate(workspaceProxyConfig)) {
            for (const ws of workspaces) {
                const parsed = WorkspaceItemSchema.safeParse(ws);
                if (!parsed.success) {
                    throw new Error('Invalid workspace shape');
                }
                workspaceSlugs.push(parsed.data.workspace.slug);
            }
        }

        let maxUpdatedOn: string | undefined;

        if (isFullRefresh) {
            await nango.trackDeletesStart('PullRequest');
        }

        for (const workspaceSlug of workspaceSlugs) {
            const repoProxyConfig: ProxyConfiguration = {
                // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
                endpoint: `/2.0/repositories/${encodeURIComponent(workspaceSlug)}`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'pagelen',
                    limit: 50,
                    response_path: 'values'
                },
                retries: 3
            };

            for await (const repos of nango.paginate(repoProxyConfig)) {
                for (const repo of repos) {
                    const parsedRepo = RepositoryItemSchema.safeParse(repo);
                    if (!parsedRepo.success) {
                        throw new Error('Invalid repository shape');
                    }
                    const repoSlug = parsedRepo.data.slug;

                    const prProxyConfig: ProxyConfiguration = {
                        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-get
                        endpoint: `/2.0/repositories/${encodeURIComponent(workspaceSlug)}/${encodeURIComponent(repoSlug)}/pullrequests`,
                        params: {
                            state: ['OPEN', 'MERGED', 'DECLINED', 'SUPERSEDED'],
                            sort: '-updated_on'
                        },
                        paginate: {
                            type: 'offset',
                            offset_name_in_request: 'page',
                            offset_start_value: 1,
                            offset_calculation_method: 'per-page',
                            limit_name_in_request: 'pagelen',
                            limit: 50,
                            response_path: 'values'
                        },
                        retries: 3
                    };

                    for await (const prs of nango.paginate(prProxyConfig)) {
                        const prsToSave: Array<z.infer<typeof PullRequestSchema>> = [];
                        let shouldStop = false;

                        for (const pr of prs) {
                            const parsedPr = PullRequestItemSchema.safeParse(pr);
                            if (!parsedPr.success) {
                                throw new Error('Invalid pull request shape');
                            }

                            const prData = parsedPr.data;

                            if (updatedAfter && prData.updated_on && prData.updated_on < updatedAfter) {
                                shouldStop = true;
                                break;
                            }

                            prsToSave.push({
                                id: String(prData.id),
                                title: prData.title,
                                state: prData.state,
                                created_on: prData.created_on,
                                updated_on: prData.updated_on,
                                author_uuid: prData.author?.uuid,
                                source_branch: prData.source?.branch?.name,
                                destination_branch: prData.destination?.branch?.name,
                                comment_count: prData.comment_count,
                                task_count: prData.task_count,
                                draft: prData.draft,
                                mergeable: prData.mergeable
                            });

                            if (prData.updated_on && (!maxUpdatedOn || prData.updated_on > maxUpdatedOn)) {
                                maxUpdatedOn = prData.updated_on;
                            }
                        }

                        if (prsToSave.length > 0) {
                            await nango.batchSave(prsToSave, 'PullRequest');
                        }

                        if (shouldStop) {
                            break;
                        }
                    }
                }
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('PullRequest');
        }

        if (maxUpdatedOn) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedOn });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
