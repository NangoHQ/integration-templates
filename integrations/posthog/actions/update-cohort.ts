import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('PostHog project ID. Example: 309484'),
    id: z.number().describe('Cohort ID. Example: 342249'),
    name: z.string().nullable().optional().describe('Cohort name. Set to null to clear.'),
    description: z.string().optional().describe('Cohort description.'),
    deleted: z.boolean().optional().describe('Soft-delete the cohort.'),
    filters: z.record(z.string(), z.unknown()).optional().describe('Cohort filters object.'),
    query: z.unknown().optional().describe('Cohort query.'),
    is_static: z.boolean().optional().describe('Whether the cohort is static.'),
    cohort_type: z.string().optional().describe('Cohort type.')
});

const CohortSchema = z
    .object({
        id: z.number(),
        name: z.string().nullable().optional(),
        description: z.string().optional(),
        groups: z.unknown().nullable().optional(),
        deleted: z.boolean(),
        filters: z.record(z.string(), z.unknown()).nullable().optional(),
        query: z.unknown().nullable().optional(),
        version: z.number().optional(),
        pending_version: z.number().optional(),
        is_calculating: z.boolean().optional(),
        created_at: z.string().optional(),
        last_calculation: z.string().optional(),
        errors_calculating: z.number().optional(),
        last_error_message: z.string().nullable().optional(),
        count: z.number().nullable().optional(),
        is_static: z.boolean().optional(),
        cohort_type: z.string().optional(),
        experiment_set: z.array(z.number()).optional(),
        _create_in_folder: z.string().optional(),
        _create_static_person_ids: z.array(z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update a cohort in PostHog.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-cohort',
        group: 'Cohorts'
    },
    input: InputSchema,
    output: CohortSchema,
    scopes: ['cohort:write'],

    exec: async (nango, input): Promise<z.infer<typeof CohortSchema>> => {
        const response = await nango.patch({
            // https://posthog.com/docs/api/cohorts
            endpoint: `/api/projects/${encodeURIComponent(String(input.project_id))}/cohorts/${encodeURIComponent(String(input.id))}/`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.deleted !== undefined && { deleted: input.deleted }),
                ...(input.filters !== undefined && { filters: input.filters }),
                ...(input.query !== undefined && { query: input.query }),
                ...(input.is_static !== undefined && { is_static: input.is_static }),
                ...(input.cohort_type !== undefined && { cohort_type: input.cohort_type })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Cohort not found or update failed.'
            });
        }

        const cohort = CohortSchema.parse(response.data);
        return cohort;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
