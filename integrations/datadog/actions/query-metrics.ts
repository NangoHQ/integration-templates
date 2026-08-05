import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.number().describe('Start of the queried time period in Unix epoch seconds. Example: 1672531200'),
    to: z.number().describe('End of the queried time period in Unix epoch seconds. Example: 1672617600'),
    query: z.string().describe('Metric query string. Example: system.cpu.idle{*}')
});

const UnitSchema = z.object({
    family: z.string().optional(),
    scale_factor: z.number().optional(),
    name: z.string().optional(),
    short_name: z.string().optional(),
    plural: z.string().optional(),
    id: z.number().optional()
});

const SeriesSchema = z.object({
    metric: z.string(),
    tag_set: z.array(z.string()).optional(),
    scope: z.string().optional(),
    pointlist: z.array(z.tuple([z.number(), z.number().nullable()])).optional(),
    display_name: z.string().optional(),
    unit: z.array(UnitSchema.nullable()).optional(),
    expression: z.string().optional(),
    interval: z.number().optional(),
    length: z.number().optional(),
    start: z.number().optional(),
    end: z.number().optional(),
    aggr: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    status: z.string().optional(),
    res_type: z.string().optional(),
    series: z.array(SeriesSchema).optional(),
    from_date: z.number().optional(),
    to_date: z.number().optional(),
    group_by: z.array(z.string()).optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Query a metric time series data points over a time range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.datadoghq.com/api/latest/metrics/#query-timeseries-points
        const response = await nango.get({
            endpoint: 'v1/query',
            params: {
                from: String(input.from),
                to: String(input.to),
                query: input.query
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
