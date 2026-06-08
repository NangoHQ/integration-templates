import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderInsightSchema = z.object({
    id: z.number(),
    short_id: z.string(),
    name: z.string().nullable(),
    derived_name: z.string().nullable(),
    query: z.unknown().nullable(),
    order: z.number().nullable(),
    deleted: z.boolean(),
    dashboards: z.array(z.number()).optional(),
    last_refresh: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.string().nullable(),
    tags: z.array(z.string().nullable()).optional(),
    favorited: z.boolean(),
    last_modified_at: z.string(),
    is_sample: z.boolean().optional()
});

const InsightSchema = z.object({
    id: z.string(),
    short_id: z.string(),
    name: z.string().optional(),
    derived_name: z.string().optional(),
    query: z.unknown().optional(),
    deleted: z.boolean(),
    dashboards: z.array(z.number()).optional(),
    last_refresh: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    favorited: z.boolean(),
    last_modified_at: z.string(),
    is_sample: z.boolean().optional()
});

const MetadataSchema = z.object({
    project_id: z.string().optional()
});

const sync = createSync({
    description: 'Sync insights from PostHog',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    endpoints: [{ method: 'GET', path: '/syncs/insights' }],
    models: {
        Insight: InsightSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        let projectId = metadata?.project_id;

        if (!projectId || typeof projectId !== 'string') {
            const connection = await nango.getConnection();
            projectId = connection.connection_config?.['projectId'] ?? connection.connection_config?.['project_id'];
        }

        if (!projectId || typeof projectId !== 'string') {
            throw new Error('project_id is required in metadata or connection config');
        }

        // Blocker: the insights list endpoint does not expose an updated_after,
        // modified_since, or equivalent query parameter, and there is no
        // changed-records or cursor-based delta endpoint.
        await nango.trackDeletesStart('Insight');

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/insights
            endpoint: `api/projects/${encodeURIComponent(projectId)}/insights/`,
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
            const providerInsights = z.array(ProviderInsightSchema).safeParse(page);
            if (!providerInsights.success) {
                throw new Error(`Failed to parse insights: ${providerInsights.error.message}`);
            }

            const insights = providerInsights.data.map((insight) => ({
                id: String(insight.id),
                short_id: insight.short_id,
                ...(insight.name != null && { name: insight.name }),
                ...(insight.derived_name != null && { derived_name: insight.derived_name }),
                ...(insight.query != null && { query: insight.query }),
                deleted: insight.deleted,
                ...(insight.dashboards != null && { dashboards: insight.dashboards }),
                ...(insight.last_refresh != null && { last_refresh: insight.last_refresh }),
                created_at: insight.created_at,
                updated_at: insight.updated_at,
                ...(insight.description != null && { description: insight.description }),
                ...(insight.tags != null && {
                    tags: insight.tags.flatMap((tag) => (tag != null ? [tag] : []))
                }),
                favorited: insight.favorited,
                last_modified_at: insight.last_modified_at,
                ...(insight.is_sample != null && { is_sample: insight.is_sample })
            }));

            if (insights.length > 0) {
                await nango.batchSave(insights, 'Insight');
            }
        }

        await nango.trackDeletesEnd('Insight');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
