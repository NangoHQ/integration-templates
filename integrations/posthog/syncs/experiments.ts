import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    project_id: z.string().describe('PostHog project ID')
});

const ExperimentSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    feature_flag_key: z.string().nullable().optional(),
    feature_flag: z.unknown().optional(),
    holdout: z.unknown().optional(),
    holdout_id: z.number().nullable().optional(),
    exposure_cohort: z.number().nullable().optional(),
    parameters: z.unknown().optional(),
    secondary_metrics: z.unknown().optional(),
    saved_metrics: z.unknown().optional(),
    saved_metrics_ids: z.unknown().optional(),
    filters: z.unknown().optional(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional(),
    created_by: z.unknown().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    exposure_criteria: z.unknown().optional(),
    metrics: z.unknown().optional(),
    metrics_secondary: z.unknown().optional(),
    stats_config: z.unknown().optional(),
    scheduling_config: z.unknown().optional(),
    conclusion: z.string().nullable().optional(),
    conclusion_comment: z.string().nullable().optional(),
    primary_metrics_ordered_uuids: z.array(z.string()).nullable().optional(),
    secondary_metrics_ordered_uuids: z.array(z.string()).nullable().optional(),
    only_count_matured_users: z.boolean().optional(),
    status: z.string().nullable().optional(),
    user_access_level: z.string().nullable().optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const sync = createSync({
    description: 'Sync experiments from PostHog.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    scopes: ['experiment:read'],
    models: {
        Experiment: ExperimentSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/experiments'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('project_id is required in metadata');
        }
        const projectId = parsedMetadata.data.project_id;

        // Blocker: the experiments list endpoint supports offset pagination and
        // filters like status/search, but does not expose an updated_after,
        // modified_since, since_id, or delta feed that can safely drive an
        // incremental sync.
        await nango.trackDeletesStart('Experiment');

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/experiments
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/experiments/`,
            params: {
                limit: 100
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'results'
            },
            retries: 3
        };

        for await (const experiments of nango.paginate(proxyConfig)) {
            if (!Array.isArray(experiments)) {
                throw new Error('Unexpected non-array experiments page');
            }

            const syncedExperiments = [];
            for (const raw of experiments) {
                if (!isRecord(raw)) {
                    throw new Error('Unexpected non-object experiment record');
                }

                if (typeof raw['id'] !== 'number') {
                    throw new Error('Experiment id must be a number');
                }

                const experiment = ExperimentSchema.parse({
                    ...raw,
                    id: String(raw['id'])
                });

                syncedExperiments.push(experiment);
            }

            if (syncedExperiments.length > 0) {
                await nango.batchSave(syncedExperiments, 'Experiment');
            }
        }

        await nango.trackDeletesEnd('Experiment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
