import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cohort_id: z.string().describe('The ID of the cohort to download. Example: "abc123"')
});

const CohortSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        finished: z.boolean(),
        size: z.number().optional(),
        last_modified: z.number().optional(),
        last_computed: z.string().optional(),
        type: z.string().optional(),
        app: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    cohort: CohortSchema,
    amplitude_ids: z.array(z.union([z.string(), z.number()])).optional(),
    user_ids: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    cohort: z.record(z.string(), z.unknown()),
    amplitude_ids: z.array(z.string()).optional(),
    user_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Download cohort members',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/behavioral-cohorts
        const response = await nango.get({
            endpoint: `/api/3/cohorts/${encodeURIComponent(input.cohort_id)}`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.safeParse(response.data);

        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape.',
                details: providerData.error.message
            });
        }

        const { cohort, amplitude_ids, user_ids } = providerData.data;

        if (cohort.finished !== true) {
            throw new nango.ActionError({
                type: 'cohort_not_ready',
                message: `Cohort ${input.cohort_id} is still computing.`,
                cohort_id: input.cohort_id
            });
        }

        return {
            cohort: cohort,
            amplitude_ids: amplitude_ids ? amplitude_ids.map((id) => String(id)) : undefined,
            user_ids: user_ids ? user_ids.map((id) => String(id)) : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
