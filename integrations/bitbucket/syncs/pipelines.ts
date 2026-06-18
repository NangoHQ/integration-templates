import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderPipelineSchema = z.object({
    uuid: z.string(),
    build_number: z.number().optional(),
    created_on: z.string(),
    completed_on: z.string().optional(),
    state: z
        .object({
            name: z.string().optional(),
            type: z.string().optional(),
            stage: z
                .object({
                    name: z.string().optional(),
                    type: z.string().optional()
                })
                .optional(),
            result: z
                .object({
                    name: z.string().optional(),
                    type: z.string().optional()
                })
                .optional()
        })
        .optional(),
    trigger: z
        .object({
            name: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    target: z
        .object({
            type: z.string().optional(),
            ref_type: z.string().optional(),
            ref_name: z.string().optional()
        })
        .optional(),
    repository: z
        .object({
            uuid: z.string().optional(),
            name: z.string().optional(),
            full_name: z.string().optional()
        })
        .optional(),
    build_seconds_used: z.number().optional()
});

const PipelineSchema = z.object({
    id: z.string(),
    uuid: z.string(),
    build_number: z.number().optional(),
    created_on: z.string(),
    completed_on: z.string().optional(),
    state: z
        .object({
            name: z.string().optional(),
            type: z.string().optional(),
            stage: z
                .object({
                    name: z.string().optional(),
                    type: z.string().optional()
                })
                .optional(),
            result: z
                .object({
                    name: z.string().optional(),
                    type: z.string().optional()
                })
                .optional()
        })
        .optional(),
    trigger: z
        .object({
            name: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    target: z
        .object({
            type: z.string().optional(),
            ref_type: z.string().optional(),
            ref_name: z.string().optional()
        })
        .optional(),
    repository: z
        .object({
            uuid: z.string().optional(),
            name: z.string().optional(),
            full_name: z.string().optional()
        })
        .optional(),
    build_seconds_used: z.number().optional()
});

const CheckpointSchema = z.object({
    created_after: z.string()
});

const sync = createSync({
    description: 'Sync pipeline runs per repository',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Pipeline: PipelineSchema
    },
    endpoints: [
        {
            path: '/syncs/pipelines',
            method: 'GET'
        }
    ],
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = checkpoint ? CheckpointSchema.safeParse(checkpoint) : null;
        const createdAfter = parsedCheckpoint?.success ? parsedCheckpoint.data['created_after'] : undefined;

        const workspacesProxyConfig: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-user-workspaces-get
            endpoint: '/2.0/user/workspaces',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next',
                response_path: 'values',
                limit: 30,
                limit_name_in_request: 'pagelen'
            },
            retries: 3
        };

        const WorkspaceAccessSchema = z.object({
            workspace: z.object({
                slug: z.string()
            })
        });

        let maxCreatedOn: string | undefined;

        for await (const workspacesPage of nango.paginate<unknown>(workspacesProxyConfig)) {
            const workspaces = z.array(WorkspaceAccessSchema).parse(workspacesPage);

            for (const workspaceAccess of workspaces) {
                const workspaceSlug = workspaceAccess.workspace.slug;

                const reposProxyConfig: ProxyConfiguration = {
                    // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
                    endpoint: `/2.0/repositories/${encodeURIComponent(workspaceSlug)}`,
                    paginate: {
                        type: 'link',
                        link_path_in_response_body: 'next',
                        response_path: 'values',
                        limit: 30,
                        limit_name_in_request: 'pagelen'
                    },
                    retries: 3
                };

                const RepoSchema = z.object({ slug: z.string() });

                for await (const reposPage of nango.paginate<unknown>(reposProxyConfig)) {
                    const repos = z.array(RepoSchema).parse(reposPage);

                    for (const repo of repos) {
                        const repoSlug = repo.slug;

                        // @allowTryCatch Pipelines may not be enabled on a repository,
                        // which returns 404. Skip those repositories and continue.
                        try {
                            for await (const page of nango.paginate({
                                // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pipelines/#api-repositories-workspace-repo-slug-pipelines-get
                                endpoint: `/2.0/repositories/${encodeURIComponent(workspaceSlug)}/${encodeURIComponent(repoSlug)}/pipelines`,
                                params: {
                                    sort: '-created_on'
                                },
                                paginate: {
                                    type: 'offset',
                                    offset_name_in_request: 'page',
                                    offset_start_value: 1,
                                    offset_calculation_method: 'per-page',
                                    limit_name_in_request: 'pagelen',
                                    limit: 10,
                                    response_path: 'values'
                                },
                                retries: 3
                            })) {
                                const pipelines = z.array(ProviderPipelineSchema).safeParse(page);
                                if (!pipelines.success) {
                                    throw new Error('Failed to parse pipelines response');
                                }

                                const newPipelines: Array<z.infer<typeof PipelineSchema>> = [];
                                let shouldBreak = false;

                                for (const pipeline of pipelines.data) {
                                    if (createdAfter && pipeline.created_on < createdAfter) {
                                        shouldBreak = true;
                                        break;
                                    }
                                    newPipelines.push({
                                        id: pipeline.uuid,
                                        uuid: pipeline.uuid,
                                        build_number: pipeline.build_number,
                                        created_on: pipeline.created_on,
                                        completed_on: pipeline.completed_on,
                                        state: pipeline.state,
                                        trigger: pipeline.trigger,
                                        target: pipeline.target,
                                        repository: pipeline.repository,
                                        build_seconds_used: pipeline.build_seconds_used
                                    });
                                    if (maxCreatedOn === undefined || pipeline.created_on > maxCreatedOn) {
                                        maxCreatedOn = pipeline.created_on;
                                    }
                                }

                                if (newPipelines.length > 0) {
                                    await nango.batchSave(newPipelines, 'Pipeline');
                                }

                                if (shouldBreak) {
                                    break;
                                }
                            }
                        } catch (error) {
                            if (error instanceof Error && error.message.includes('404')) {
                                continue;
                            }
                            throw error;
                        }
                    }
                }
            }
        }

        if (maxCreatedOn !== undefined) {
            await nango.saveCheckpoint({ created_after: maxCreatedOn });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
