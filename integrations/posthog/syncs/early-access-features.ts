import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const FeatureFlagSchema = z.object({
    id: z.number(),
    team_id: z.number(),
    name: z.string().nullable().optional(),
    key: z.string(),
    filters: z.record(z.string(), z.unknown()).optional(),
    deleted: z.boolean().optional(),
    active: z.boolean().optional(),
    ensure_experience_continuity: z.boolean().nullable().optional(),
    version: z.number().optional(),
    evaluation_runtime: z.string().optional(),
    bucketing_identifier: z.string().optional(),
    evaluation_contexts: z.array(z.string()).optional()
});

const EarlyAccessFeatureResponseSchema = z.object({
    id: z.string(),
    feature_flag: FeatureFlagSchema.nullable().optional(),
    name: z.string(),
    description: z.string(),
    stage: z.string(),
    documentation_url: z.string(),
    payload: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string()
});

const EarlyAccessFeatureSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    stage: z.string(),
    documentation_url: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string(),
    feature_flag_id: z.number().optional(),
    feature_flag_key: z.string().optional()
});

const MetadataSchema = z.object({
    project_id: z.string()
});

const sync = createSync({
    description: 'Sync early access features from PostHog.',
    version: '1.0.0',
    // https://posthog.com/docs/api/early-access-feature
    endpoints: [{ method: 'GET', path: '/syncs/early-access-features' }],
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    scopes: ['early_access_feature:read'],
    models: {
        EarlyAccessFeature: EarlyAccessFeatureSchema
    },
    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        if (!metadata?.project_id) {
            throw new Error('project_id is required in metadata');
        }
        const projectId = metadata.project_id;

        await nango.trackDeletesStart('EarlyAccessFeature');

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/early-access-feature
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/early_access_feature/`,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'next',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'results'
            },
            retries: 3
        };

        for await (const batch of nango.paginate<unknown>(proxyConfig)) {
            const features = batch.map((item) => {
                const record = EarlyAccessFeatureResponseSchema.parse(item);
                return {
                    id: record.id,
                    name: record.name,
                    description: record.description,
                    stage: record.stage,
                    documentation_url: record.documentation_url,
                    payload: record.payload,
                    created_at: record.created_at,
                    ...(record.feature_flag?.id !== undefined && { feature_flag_id: record.feature_flag.id }),
                    ...(record.feature_flag?.key !== undefined && { feature_flag_key: record.feature_flag.key })
                };
            });

            if (features.length > 0) {
                await nango.batchSave(features, 'EarlyAccessFeature');
            }
        }

        await nango.trackDeletesEnd('EarlyAccessFeature');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
