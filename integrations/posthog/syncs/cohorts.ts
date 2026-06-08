import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCohortSchema = z.object({
    id: z.number().int(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    groups: z.unknown().nullable().optional(),
    deleted: z.boolean().optional(),
    filters: z.unknown().nullable().optional(),
    query: z.unknown().nullable().optional(),
    version: z.number().int().nullable().optional(),
    pending_version: z.number().int().nullable().optional(),
    is_calculating: z.boolean().optional(),
    created_by: z
        .object({
            id: z.number().int().optional(),
            email: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    created_at: z.string().nullable().optional(),
    last_calculation: z.string().nullable().optional(),
    last_backfill_person_properties_at: z.string().nullable().optional(),
    errors_calculating: z.number().int().nullable().optional(),
    last_error_message: z.string().nullable().optional(),
    count: z.number().int().nullable().optional(),
    is_static: z.boolean().optional(),
    cohort_type: z.string().nullable().optional(),
    experiment_set: z.array(z.number().int()).nullable().optional(),
    _create_in_folder: z.string().nullable().optional(),
    _create_static_person_ids: z.array(z.unknown()).nullable().optional()
});

const CohortSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    last_calculation: z.string().optional(),
    deleted: z.boolean().optional(),
    is_static: z.boolean().optional(),
    cohort_type: z.string().optional(),
    count: z.number().int().nullable().optional(),
    is_calculating: z.boolean().optional(),
    errors_calculating: z.number().int().optional(),
    created_by_id: z.number().int().optional(),
    created_by_email: z.string().optional()
});

const MetadataSchema = z.object({
    project_id: z.string()
});

const sync = createSync({
    description: 'Sync cohorts from PostHog.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        Cohort: CohortSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/cohorts'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.project_id) {
            throw new Error('project_id is required in metadata');
        }

        await nango.trackDeletesStart('Cohort');

        const proxyConfig: ProxyConfiguration = {
            // https://posthog.com/docs/api/cohorts
            endpoint: `/api/projects/${encodeURIComponent(metadata.project_id)}/cohorts/`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedItems = z.array(ProviderCohortSchema).safeParse(page);

            if (!parsedItems.success) {
                throw new Error(`Failed to parse cohorts response: ${parsedItems.error.message}`);
            }

            const cohorts = parsedItems.data.map((raw) => {
                const createdBy = raw.created_by;
                return {
                    id: String(raw.id),
                    ...(raw.name != null && { name: raw.name }),
                    ...(raw.description != null && { description: raw.description }),
                    ...(raw.created_at != null && { created_at: raw.created_at }),
                    ...(raw.last_calculation != null && { last_calculation: raw.last_calculation }),
                    ...(raw.deleted !== undefined && { deleted: raw.deleted }),
                    ...(raw.is_static !== undefined && { is_static: raw.is_static }),
                    ...(raw.cohort_type != null && { cohort_type: raw.cohort_type }),
                    ...(raw.count !== undefined && { count: raw.count }),
                    ...(raw.is_calculating !== undefined && { is_calculating: raw.is_calculating }),
                    ...(raw.errors_calculating != null && { errors_calculating: raw.errors_calculating }),
                    ...(createdBy?.id !== undefined && { created_by_id: createdBy.id }),
                    ...(createdBy?.email != null && { created_by_email: createdBy.email })
                };
            });

            if (cohorts.length > 0) {
                await nango.batchSave(cohorts, 'Cohort');
            }
        }

        await nango.trackDeletesEnd('Cohort');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
