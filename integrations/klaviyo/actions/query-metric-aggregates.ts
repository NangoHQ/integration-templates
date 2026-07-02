import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    metric_id: z.string().describe('The ID of the metric to query aggregates for. Example: "UGkwJB"'),
    measurements: z.array(z.string()).describe('The measurements to return. Example: ["count", "sum_value"]'),
    interval: z.string().describe('The time bucket size. Example: "day"'),
    timezone: z.string().optional().describe('The timezone for the query. Defaults to UTC. Example: "UTC"'),
    filter: z
        .array(z.string())
        .optional()
        .describe('Filters to apply. Example: ["greater-or-equal(datetime,2026-01-01T00:00:00Z)", "less-than(datetime,2026-07-03T00:00:00Z)"]'),
    by: z.array(z.string()).optional().describe('Dimensions to group by.'),
    return_fields: z.array(z.string()).optional().describe('Fields to return in the response.'),
    page_size: z.number().optional().describe('Number of results per page.'),
    sort: z.string().optional().describe('Sort order.')
});

const MetricAggregatePointSchema = z.object({
    dimensions: z.array(z.string()),
    measurements: z.record(z.string(), z.array(z.number()))
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.literal('metric-aggregate'),
        id: z.string(),
        attributes: z.object({
            dates: z.array(z.string()),
            data: z.array(MetricAggregatePointSchema).optional()
        })
    }),
    links: z
        .object({
            self: z.string().optional(),
            next: z.string().nullable().optional(),
            prev: z.string().nullable().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.literal('metric-aggregate'),
    metric_id: z.string(),
    measurements: z.array(z.string()),
    interval: z.string(),
    timezone: z.string().optional(),
    filter: z.array(z.string()).optional(),
    by: z.array(z.string()).optional(),
    return_fields: z.array(z.string()).optional(),
    dates: z.array(z.string()),
    data: z.array(MetricAggregatePointSchema).optional(),
    links: z
        .object({
            self: z.string().optional(),
            next: z.string().nullable().optional(),
            prev: z.string().nullable().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Query aggregated event data for a metric',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metrics:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            data: {
                type: 'metric-aggregate',
                attributes: {
                    metric_id: input.metric_id,
                    measurements: input.measurements,
                    interval: input.interval,
                    ...(input.timezone !== undefined && { timezone: input.timezone }),
                    ...(input.filter !== undefined && { filter: input.filter }),
                    ...(input.by !== undefined && { by: input.by }),
                    ...(input.return_fields !== undefined && { return_fields: input.return_fields }),
                    ...(input.page_size !== undefined && { page_size: input.page_size }),
                    ...(input.sort !== undefined && { sort: input.sort })
                }
            }
        };

        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/query_metric_aggregates
            endpoint: '/api/metric-aggregates',
            data: body,
            retries: 3,
            headers: {
                revision: '2026-04-15'
            }
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const attrs = parsed.data.attributes;

        return {
            id: parsed.data.id,
            type: 'metric-aggregate',
            metric_id: input.metric_id,
            measurements: input.measurements,
            interval: input.interval,
            ...(input.timezone !== undefined && { timezone: input.timezone }),
            ...(input.filter !== undefined && { filter: input.filter }),
            ...(input.by !== undefined && { by: input.by }),
            ...(input.return_fields !== undefined && { return_fields: input.return_fields }),
            dates: attrs.dates,
            ...(attrs.data !== undefined && { data: attrs.data }),
            ...(parsed.links !== undefined && { links: parsed.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
