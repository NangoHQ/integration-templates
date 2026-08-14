import { z } from 'zod';
import { createAction } from 'nango';

const ComputeSchema = z.object({
    aggregation_type: z.enum(['count', 'distribution']),
    include_percentiles: z.boolean().optional(),
    path: z.string().optional()
});

const FilterSchema = z.object({
    query: z.string()
});

const GroupBySchema = z.object({
    path: z.string(),
    tag_name: z.string().optional()
});

const UniquenessSchema = z.object({
    when: z.enum(['match', 'end'])
});

const RumMetricAttributesSchema = z.object({
    compute: ComputeSchema,
    event_type: z.enum(['session', 'view', 'action', 'error', 'resource', 'long_task', 'vital']),
    filter: FilterSchema,
    group_by: z.array(GroupBySchema).optional(),
    uniqueness: UniquenessSchema.optional()
});

const RumMetricSchema = z.object({
    id: z.string(),
    type: z.literal('rum_metrics'),
    attributes: RumMetricAttributesSchema
});

const InputSchema = z.object({});

const OutputSchema = z.object({
    metrics: z.array(RumMetricSchema)
});

const action = createAction({
    description: 'List custom metrics derived from RUM events.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/rum-metrics/#get-all-rum-based-metrics
            endpoint: 'v2/rum/config/metrics',
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Datadog API'
            });
        }

        const providerResponse = z
            .object({
                data: z.array(z.unknown())
            })
            .parse(response.data);

        const metrics = providerResponse.data.map((item: unknown) => {
            const parsed = RumMetricSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse a RUM metric from the API response'
                });
            }
            return parsed.data;
        });

        return {
            metrics
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
