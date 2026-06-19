import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    cohort_id: z.number().describe('Cohort ID. Example: 342249')
});

const ProviderCohortSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    deleted: z.boolean(),
    name: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a cohort in PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cohort:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/cohorts
        // Hard delete is not allowed; PATCH to set deleted: true is the provider-specific archive/soft-delete semantic.
        const response = await nango.patch({
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/cohorts/${encodeURIComponent(input.cohort_id)}/`,
            data: {
                deleted: true
            },
            retries: 3
        });

        const cohort = ProviderCohortSchema.parse(response.data);

        return {
            id: cohort.id,
            deleted: cohort.deleted ?? true,
            ...(cohort.name !== undefined && { name: cohort.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
