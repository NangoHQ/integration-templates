import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    project_id: z.string()
});

const ProviderDashboardSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    pinned: z.boolean().optional(),
    created_at: z.string().nullable().optional(),
    created_by: z.unknown().nullable().optional(),
    last_accessed_at: z.string().nullable().optional(),
    last_viewed_at: z.string().nullable().optional(),
    is_shared: z.boolean().optional(),
    deleted: z.boolean().optional(),
    creation_mode: z.string().optional(),
    tags: z.array(z.string()).optional(),
    restriction_level: z.number().optional(),
    effective_restriction_level: z.number().optional(),
    effective_privilege_level: z.number().optional(),
    user_access_level: z.string().nullable().optional(),
    access_control_version: z.string().nullable().optional(),
    last_refresh: z.string().nullable().optional(),
    team_id: z.number().optional()
});

const DashboardSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    pinned: z.boolean().optional(),
    created_at: z.string().optional(),
    created_by: z.unknown().optional(),
    last_accessed_at: z.string().optional(),
    last_viewed_at: z.string().optional(),
    is_shared: z.boolean().optional(),
    deleted: z.boolean().optional(),
    creation_mode: z.string().optional(),
    tags: z.array(z.string()).optional(),
    restriction_level: z.number().optional(),
    effective_restriction_level: z.number().optional(),
    effective_privilege_level: z.number().optional(),
    user_access_level: z.string().optional(),
    access_control_version: z.string().optional(),
    last_refresh: z.string().optional(),
    team_id: z.number().optional()
});

const sync = createSync({
    description: 'Sync dashboards from PostHog.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Dashboard: DashboardSchema
    },
    // https://posthog.com/docs/api/dashboards
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/dashboards'
        }
    ],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadata = MetadataSchema.parse(rawMetadata);

        if (!metadata.project_id) {
            throw new Error('project_id is required in metadata');
        }

        const projectId = metadata.project_id;

        await nango.trackDeletesStart('Dashboard');

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/dashboards
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/dashboards/`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const dashboards = page.map((item) => {
                const parsed = ProviderDashboardSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse dashboard: ${parsed.error.message}`);
                }

                const dashboard = parsed.data;
                return {
                    id: String(dashboard.id),
                    ...(dashboard.name != null && { name: dashboard.name }),
                    ...(dashboard.description != null && { description: dashboard.description }),
                    ...(dashboard.pinned !== undefined && { pinned: dashboard.pinned }),
                    ...(dashboard.created_at != null && { created_at: dashboard.created_at }),
                    ...(dashboard.created_by !== undefined && { created_by: dashboard.created_by }),
                    ...(dashboard.last_accessed_at != null && { last_accessed_at: dashboard.last_accessed_at }),
                    ...(dashboard.last_viewed_at != null && { last_viewed_at: dashboard.last_viewed_at }),
                    ...(dashboard.is_shared !== undefined && { is_shared: dashboard.is_shared }),
                    ...(dashboard.deleted !== undefined && { deleted: dashboard.deleted }),
                    ...(dashboard.creation_mode != null && { creation_mode: dashboard.creation_mode }),
                    ...(dashboard.tags !== undefined && { tags: dashboard.tags }),
                    ...(dashboard.restriction_level !== undefined && { restriction_level: dashboard.restriction_level }),
                    ...(dashboard.effective_restriction_level !== undefined && { effective_restriction_level: dashboard.effective_restriction_level }),
                    ...(dashboard.effective_privilege_level !== undefined && { effective_privilege_level: dashboard.effective_privilege_level }),
                    ...(dashboard.user_access_level != null && { user_access_level: dashboard.user_access_level }),
                    ...(dashboard.access_control_version != null && { access_control_version: dashboard.access_control_version }),
                    ...(dashboard.last_refresh != null && { last_refresh: dashboard.last_refresh }),
                    ...(dashboard.team_id !== undefined && { team_id: dashboard.team_id })
                };
            });

            if (dashboards.length > 0) {
                await nango.batchSave(dashboards, 'Dashboard');
            }
        }

        await nango.trackDeletesEnd('Dashboard');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
