import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderNamespaceSchema = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    kind: z.string().optional(),
    full_path: z.string().optional()
});

const ProviderOwnerSchema = z.object({
    id: z.number(),
    username: z.string().optional(),
    name: z.string().optional()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    path_with_namespace: z.string().optional(),
    description: z.string().nullable().optional(),
    web_url: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    last_activity_at: z.string(),
    visibility: z.string().optional(),
    default_branch: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    topics: z.array(z.string()).optional(),
    namespace: ProviderNamespaceSchema.nullable().optional(),
    owner: ProviderOwnerSchema.nullable().optional(),
    star_count: z.number().optional(),
    forks_count: z.number().optional(),
    open_issues_count: z.number().optional()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
    path_with_namespace: z.string().optional(),
    description: z.string().optional(),
    web_url: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    last_activity_at: z.string(),
    visibility: z.string().optional(),
    default_branch: z.string().optional(),
    archived: z.boolean().optional(),
    topics: z.array(z.string()).optional(),
    namespace_id: z.number().optional(),
    namespace_name: z.string().optional(),
    namespace_path: z.string().optional(),
    owner_id: z.number().optional(),
    owner_username: z.string().optional(),
    star_count: z.number().optional(),
    forks_count: z.number().optional(),
    open_issues_count: z.number().optional()
});

const CheckpointSchema = z.object({
    last_activity_after: z.string()
});

const sync = createSync({
    description: 'Sync projects from GitLab',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://docs.gitlab.com/api/projects/#list-all-projects
    endpoints: [{ method: 'GET', path: '/syncs/projects' }],
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let maxLastActivityAt: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.gitlab.com/api/projects/#list-all-projects
            endpoint: '/api/v4/projects',
            params: {
                order_by: 'last_activity_at',
                sort: 'asc',
                membership: 'true',
                ...(checkpoint?.last_activity_after && { last_activity_after: checkpoint.last_activity_after })
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const records: Array<z.infer<typeof ProjectSchema>> = [];
            for (const item of page) {
                const parsed = ProviderProjectSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse project: ${parsed.error.message}`);
                }
                const project = parsed.data;
                records.push({
                    id: String(project.id),
                    name: project.name,
                    path: project.path,
                    ...(project.path_with_namespace !== undefined && { path_with_namespace: project.path_with_namespace }),
                    ...(project.description != null && { description: project.description }),
                    ...(project.web_url !== undefined && { web_url: project.web_url }),
                    created_at: project.created_at,
                    updated_at: project.updated_at,
                    last_activity_at: project.last_activity_at,
                    ...(project.visibility !== undefined && { visibility: project.visibility }),
                    ...(project.default_branch != null && { default_branch: project.default_branch }),
                    ...(project.archived !== undefined && { archived: project.archived }),
                    ...(project.topics !== undefined && { topics: project.topics }),
                    ...(project.namespace && {
                        namespace_id: project.namespace.id,
                        namespace_name: project.namespace.name,
                        namespace_path: project.namespace.path
                    }),
                    ...(project.owner && {
                        owner_id: project.owner.id,
                        owner_username: project.owner.username
                    }),
                    ...(project.star_count !== undefined && { star_count: project.star_count }),
                    ...(project.forks_count !== undefined && { forks_count: project.forks_count }),
                    ...(project.open_issues_count !== undefined && { open_issues_count: project.open_issues_count })
                });
            }

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'Project');
            const lastRecord = records[records.length - 1];
            if (lastRecord !== undefined && (maxLastActivityAt === undefined || lastRecord.last_activity_at > maxLastActivityAt)) {
                maxLastActivityAt = lastRecord.last_activity_at;
            }
        }

        if (maxLastActivityAt !== undefined) {
            await nango.saveCheckpoint({
                last_activity_after: maxLastActivityAt
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
