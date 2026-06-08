import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    project_id: z.string()
});

const FeatureFlagSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string().optional(),
    active: z.boolean().optional(),
    deleted: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    filters: z.record(z.string(), z.unknown()).optional(),
    version: z.number().optional(),
    tags: z.array(z.string()).optional(),
    ensure_experience_continuity: z.boolean().optional(),
    experiment_set: z.array(z.number()).optional(),
    surveys: z.unknown().optional(),
    features: z.unknown().optional(),
    usage_dashboard: z.number().optional(),
    analytics_dashboards: z.array(z.number()).optional(),
    has_enriched_analytics: z.boolean().optional(),
    is_remote_configuration: z.boolean().optional(),
    evaluation_runtime: z.string().optional(),
    bucketing_identifier: z.string().optional(),
    last_called_at: z.string().optional(),
    status: z.string().optional(),
    user_access_level: z.string().optional()
});

const ProviderFeatureFlagSchema = z.object({
    id: z.number(),
    key: z.string(),
    name: z.string().nullable().optional(),
    active: z.boolean().optional(),
    deleted: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    filters: z.record(z.string(), z.unknown()).optional(),
    version: z.number().optional(),
    tags: z.array(z.string()).optional(),
    ensure_experience_continuity: z.boolean().optional(),
    experiment_set: z.array(z.number()).optional(),
    surveys: z.unknown().optional(),
    features: z.unknown().optional(),
    usage_dashboard: z.number().nullable().optional(),
    analytics_dashboards: z.array(z.number()).optional(),
    has_enriched_analytics: z.boolean().optional(),
    is_remote_configuration: z.boolean().optional(),
    evaluation_runtime: z.string().optional(),
    bucketing_identifier: z.string().optional(),
    last_called_at: z.string().nullable().optional(),
    status: z.string().optional(),
    user_access_level: z.string().optional()
});

const sync = createSync({
    description: 'Sync feature flags from PostHog.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/feature-flags'
        }
    ],
    metadata: MetadataSchema,
    models: {
        FeatureFlag: FeatureFlagSchema
    },

    exec: async (nango) => {
        const metadataRaw = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(metadataRaw);

        if (!metadata.success || !metadata.data.project_id) {
            throw new Error('project_id is required in metadata');
        }

        // Blocker: the feature flags list endpoint supports limit/offset pagination
        // but does not expose an updated_after filter, cursor, or since_id parameter
        // for incremental fetching.
        await nango.trackDeletesStart('FeatureFlag');

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/feature-flags
            endpoint: `/api/projects/${encodeURIComponent(metadata.data.project_id)}/feature_flags/`,
            params: {
                limit: 100
            },
            paginate: {
                type: 'offset',
                limit: 100,
                limit_name_in_request: 'limit',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'per-page',
                response_path: 'results'
            },
            retries: 3
        };

        // https://posthog.com/docs/api/feature-flags
        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderFeatureFlagSchema).safeParse(page);

            if (!parsed.success) {
                throw new Error(`Failed to parse feature flags: ${parsed.error.message}`);
            }

            const flags = parsed.data.map((record) => ({
                id: String(record.id),
                key: record.key,
                ...(record.name != null && { name: record.name }),
                ...(record.active !== undefined && { active: record.active }),
                ...(record.deleted !== undefined && { deleted: record.deleted }),
                ...(record.created_at != null && { created_at: record.created_at }),
                ...(record.updated_at != null && { updated_at: record.updated_at }),
                ...(record.filters != null && { filters: record.filters }),
                ...(record.version !== undefined && { version: record.version }),
                ...(record.tags != null && { tags: record.tags }),
                ...(record.ensure_experience_continuity !== undefined && { ensure_experience_continuity: record.ensure_experience_continuity }),
                ...(record.experiment_set != null && { experiment_set: record.experiment_set }),
                ...(record.surveys != null && { surveys: record.surveys }),
                ...(record.features != null && { features: record.features }),
                ...(record.usage_dashboard != null && { usage_dashboard: record.usage_dashboard }),
                ...(record.analytics_dashboards != null && { analytics_dashboards: record.analytics_dashboards }),
                ...(record.has_enriched_analytics !== undefined && { has_enriched_analytics: record.has_enriched_analytics }),
                ...(record.is_remote_configuration !== undefined && { is_remote_configuration: record.is_remote_configuration }),
                ...(record.evaluation_runtime != null && { evaluation_runtime: record.evaluation_runtime }),
                ...(record.bucketing_identifier != null && { bucketing_identifier: record.bucketing_identifier }),
                ...(record.last_called_at != null && { last_called_at: record.last_called_at }),
                ...(record.status != null && { status: record.status }),
                ...(record.user_access_level != null && { user_access_level: record.user_access_level })
            }));

            if (flags.length > 0) {
                await nango.batchSave(flags, 'FeatureFlag');
            }
        }

        await nango.trackDeletesEnd('FeatureFlag');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
