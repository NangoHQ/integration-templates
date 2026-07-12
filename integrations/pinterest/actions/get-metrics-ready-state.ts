import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('Analytics reports request date (UTC). Format: YYYY-MM-DD. Example: "2024-07-08"')
});

const ProviderSchema = z.object({
    conversion_metrics_ready: z.boolean(),
    non_conversion_metrics_ready: z.boolean()
});

const OutputSchema = z.object({
    conversion_metrics_ready: z.boolean().describe('Whether conversion metrics are finalized and ready to query.'),
    non_conversion_metrics_ready: z.boolean().describe('Whether non-conversion metrics are finalized and ready to query.')
});

const action = createAction({
    description: 'Check whether recent analytics data has fully landed (avoid reading partial data).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#tag/Resources/paths/~1resources~1metrics_ready_state/get
            endpoint: '/v5/resources/metrics_ready_state',
            params: {
                date: input.date
            },
            retries: 3
        });

        const data = ProviderSchema.parse(response.data);

        return {
            conversion_metrics_ready: data.conversion_metrics_ready,
            non_conversion_metrics_ready: data.non_conversion_metrics_ready
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
