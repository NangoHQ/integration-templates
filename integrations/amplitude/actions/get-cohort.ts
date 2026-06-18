import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cohortId: z.string().describe('Cohort ID. Example: "abc123"')
});

const CohortSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    finished: z.boolean(),
    size: z.number().nullable().optional(),
    appId: z.number().optional(),
    archived: z.boolean().optional(),
    published: z.boolean().optional(),
    createdAt: z.number().nullable().optional(),
    lastMod: z.number().nullable().optional(),
    lastComputed: z.number().nullable().optional(),
    type: z.string().optional(),
    owners: z.array(z.string()).optional(),
    viewers: z.array(z.string()).optional(),
    hidden: z.boolean().optional(),
    metadata: z.array(z.string()).nullable().optional(),
    view_count: z.number().nullable().optional(),
    popularity: z.number().nullable().optional(),
    last_viewed: z.number().nullable().optional(),
    chart_id: z.string().nullable().optional(),
    edit_id: z.string().nullable().optional(),
    is_predictive: z.boolean().optional(),
    is_official_content: z.boolean().optional(),
    location_id: z.string().nullable().optional(),
    shortcut_ids: z.array(z.string()).optional(),
    definition: z.unknown().optional()
});

const ProviderResponseSchema = z.object({
    cohort: CohortSchema,
    amplitude_ids: z.array(z.union([z.string(), z.number()])).optional(),
    user_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    cohort: CohortSchema
});

const action = createAction({
    description: 'Retrieve cohort metadata.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/behavioral-cohorts
            endpoint: `/api/3/cohorts/${encodeURIComponent(input.cohortId)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            cohort: providerResponse.cohort
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
