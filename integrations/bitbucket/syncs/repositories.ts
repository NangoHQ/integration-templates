import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderWorkspaceSchema = z.object({
    type: z.string().optional(),
    workspace: z
        .object({
            type: z.string().optional(),
            uuid: z.string().optional(),
            name: z.string().optional(),
            slug: z.string()
        })
        .optional()
});

const ProviderRepositorySchema = z.object({
    type: z.string().optional(),
    uuid: z.string(),
    full_name: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    scm: z.string().optional(),
    is_private: z.boolean().optional(),
    owner: z
        .object({
            type: z.string().optional()
        })
        .optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    size: z.number().optional(),
    language: z.string().optional(),
    has_issues: z.boolean().optional(),
    has_wiki: z.boolean().optional(),
    fork_policy: z.string().optional(),
    project: z
        .object({
            key: z.string().optional()
        })
        .optional(),
    mainbranch: z
        .object({
            name: z.string().optional()
        })
        .optional()
});

const ProviderWorkspacesResponseSchema = z.object({
    values: z.array(ProviderWorkspaceSchema).optional(),
    size: z.number().optional(),
    page: z.number().optional(),
    pagelen: z.number().optional(),
    next: z.string().optional(),
    previous: z.string().optional()
});

const RepositorySchema = z.object({
    id: z.string(),
    uuid: z.string(),
    name: z.string().optional(),
    full_name: z.string().optional(),
    description: z.string().optional(),
    scm: z.string().optional(),
    is_private: z.boolean().optional(),
    created_on: z.string().optional(),
    updated_on: z.string().optional(),
    size: z.number().optional(),
    language: z.string().optional(),
    has_issues: z.boolean().optional(),
    has_wiki: z.boolean().optional(),
    fork_policy: z.string().optional(),
    workspace_slug: z.string().optional(),
    owner_type: z.string().optional(),
    project_key: z.string().optional(),
    mainbranch_name: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync repositories in a workspace',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/repositories',
            method: 'GET'
        }
    ],
    models: {
        Repository: RepositorySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const validatedCheckpoint = checkpoint ? CheckpointSchema.safeParse(checkpoint) : null;
        const updatedAfter = validatedCheckpoint?.success ? validatedCheckpoint.data.updated_after : undefined;

        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-workspaces/#api-user-workspaces-get
        const workspacesResponse = await nango.get({
            endpoint: '/2.0/user/workspaces',
            retries: 3
        });

        const validatedWorkspaces = ProviderWorkspacesResponseSchema.parse(workspacesResponse.data);
        const workspaces = validatedWorkspaces.values ?? [];
        const workspaceSlugs = workspaces.map((ws) => ws.workspace?.slug).filter((slug) => typeof slug === 'string');

        if (workspaceSlugs.length === 0) {
            return;
        }

        const isFullRefresh = !updatedAfter;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Repository');
        }

        let lastProcessedUpdatedAt: string | undefined;

        for (const workspaceSlug of workspaceSlugs) {
            const proxyConfig: ProxyConfiguration = {
                // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/#api-repositories-workspace-get
                endpoint: `/2.0/repositories/${encodeURIComponent(workspaceSlug)}`,
                params: {
                    sort: 'updated_on',
                    ...(updatedAfter && { q: `updated_on>="${updatedAfter}"` })
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: 1,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'pagelen',
                    limit: 100,
                    response_path: 'values'
                },
                retries: 3
            };

            for await (const repos of nango.paginate<z.infer<typeof ProviderRepositorySchema>>(proxyConfig)) {
                const repositories: z.infer<typeof RepositorySchema>[] = [];

                for (const repo of repos) {
                    const validated = ProviderRepositorySchema.parse(repo);

                    repositories.push({
                        id: validated.uuid,
                        uuid: validated.uuid,
                        ...(validated.name != null && { name: validated.name }),
                        ...(validated.full_name != null && { full_name: validated.full_name }),
                        ...(validated.description != null && { description: validated.description }),
                        ...(validated.scm != null && { scm: validated.scm }),
                        ...(validated.is_private != null && { is_private: validated.is_private }),
                        ...(validated.created_on != null && { created_on: validated.created_on }),
                        ...(validated.updated_on != null && { updated_on: validated.updated_on }),
                        ...(validated.size != null && { size: validated.size }),
                        ...(validated.language != null && { language: validated.language }),
                        ...(validated.has_issues != null && { has_issues: validated.has_issues }),
                        ...(validated.has_wiki != null && { has_wiki: validated.has_wiki }),
                        ...(validated.fork_policy != null && { fork_policy: validated.fork_policy }),
                        workspace_slug: workspaceSlug,
                        ...(validated.owner?.type != null && { owner_type: validated.owner.type }),
                        ...(validated.project?.key != null && { project_key: validated.project.key }),
                        ...(validated.mainbranch?.name != null && { mainbranch_name: validated.mainbranch.name })
                    });
                }

                if (repositories.length > 0) {
                    await nango.batchSave(repositories, 'Repository');
                    const lastRepo = repositories[repositories.length - 1];
                    if (lastRepo && lastRepo.updated_on) {
                        lastProcessedUpdatedAt = lastRepo.updated_on;
                    }
                }
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Repository');
        }

        if (lastProcessedUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: lastProcessedUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
