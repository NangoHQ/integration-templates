import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    slo_id: z.string().describe('SLO ID. Example: "de718b2c100251b8b03b23c74b93e5cd"'),
    from_ts: z.number().describe('Start of the time window in Unix epoch seconds. Example: 1785192228'),
    to_ts: z.number().describe('End of the time window in Unix epoch seconds. Example: 1785797028')
});

const SloThresholdSchema = z
    .object({
        timeframe: z.string(),
        target: z.number(),
        target_display: z.string()
    })
    .passthrough();

const SloOverallSchema = z
    .object({
        sli_value: z.number(),
        span_precision: z.number(),
        precision: z.record(z.string(), z.number()).optional(),
        corrections: z.array(z.unknown()).optional(),
        state: z.string(),
        errors: z.array(z.unknown()).nullable().optional()
    })
    .passthrough();

const SloSeriesSchema = z
    .object({
        timing: z.string().optional(),
        res_type: z.string().optional(),
        resp_version: z.number().optional(),
        query: z.string().optional(),
        from_date: z.number().optional(),
        to_date: z.number().optional(),
        message: z.string().optional(),
        interval: z.number().optional(),
        times: z.array(z.number()).optional(),
        numerator: z.record(z.string(), z.unknown()).optional(),
        denominator: z.record(z.string(), z.unknown()).optional(),
        groups: z.record(z.string(), z.unknown()).optional(),
        numerator_query: z.string().optional(),
        denominator_query: z.string().optional(),
        bad_series_query: z.string().optional(),
        graph_query: z.string().optional()
    })
    .passthrough();

const SloHistoryDataSchema = z
    .object({
        thresholds: z.record(z.string(), SloThresholdSchema).optional(),
        from_ts: z.number(),
        to_ts: z.number(),
        type: z.string(),
        type_id: z.number(),
        slo: z.record(z.string(), z.unknown()).optional(),
        group_by: z.array(z.unknown()).optional(),
        overall: SloOverallSchema.optional(),
        series: SloSeriesSchema.optional()
    })
    .passthrough();

const SloHistoryResponseSchema = z.object({
    data: SloHistoryDataSchema,
    errors: z.array(z.unknown()).nullable().optional()
});

const OutputSchema = SloHistoryDataSchema;

const action = createAction({
    description: 'Get the historical SLI value for an SLO over a time range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['slo_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/slos/#get-an-slos-history
            endpoint: `v1/slo/${encodeURIComponent(input.slo_id)}/history`,
            params: {
                from_ts: input.from_ts,
                to_ts: input.to_ts
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'SLO history not found',
                slo_id: input.slo_id
            });
        }

        const envelope = SloHistoryResponseSchema.parse(response.data);
        return envelope.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
