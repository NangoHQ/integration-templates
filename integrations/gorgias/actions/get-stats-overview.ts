import { z } from 'zod';
import { createAction } from 'nango';

const StatNameSchema = z.enum([
    'overview',
    'total-tickets-created',
    'total-tickets-replied',
    'total-tickets-closed',
    'median-first-response-time',
    'median-resolution-time',
    'tickets-per-tag',
    'tickets-closed-per-agent',
    'tickets-per-channel',
    'tickets-per-status',
    'tickets-per-satisfaction-score',
    'tickets-replies-sent',
    'tickets-per-macro',
    'tickets-resolved-per-agent',
    'tickets-first-response-time',
    'total-tickets-resolved',
    'tickets-per-urgency',
    'top-agents',
    'top-customers',
    'top-tags',
    'top-macros',
    'first-response-time',
    'resolution-time'
]);

const InputSchema = z
    .object({
        name: StatNameSchema.describe('The name of the statistic to retrieve. Example: "overview"'),
        start_datetime: z.string().describe('Start of the reporting period in ISO 8601 format with timezone. Example: "2026-08-01T00:00:00Z"'),
        end_datetime: z.string().describe('End of the reporting period in ISO 8601 format with timezone. Example: "2026-08-31T23:59:59Z"')
    })
    .describe('Input for retrieving a named Gorgias statistic over a date range.');

const StatDataSchema = z.object({
    name: z.string().describe('Human-readable name of the metric.'),
    type: z.string().describe('Data type of the metric value, e.g. "number" or "percent".'),
    value: z.union([z.number(), z.string(), z.null()]).describe('The metric value.'),
    delta: z.union([z.number(), z.null()]).describe('Period-over-period change, or null if unavailable.')
});

const MetaSchema = z.object({
    start_datetime: z.string().optional().describe('Start of the current period returned by the API.'),
    end_datetime: z.string().optional().describe('End of the current period returned by the API.'),
    previous_start_datetime: z.string().optional().describe('Start of the previous comparison period.'),
    previous_end_datetime: z.string().optional().describe('End of the previous comparison period.')
});

const OutputSchema = z
    .object({
        data: z.array(StatDataSchema).describe('List of statistics for the requested period.'),
        meta: MetaSchema.describe('Period boundaries used by the API, including any previous comparison window.')
    })
    .describe('Output containing the requested statistics and their period boundaries.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a named read-only statistic from the Gorgias API.
 * @pitfalls: The API automatically computes a previous comparison period and returns `delta` values alongside each metric; some metrics may have a `null` value while still returning a `delta` of `0`.
 */
const action = createAction({
    description: 'Retrieve a named statistic over a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.gorgias.com/reference/post-stats-name
            endpoint: `/api/stats/${encodeURIComponent(input.name)}`,
            data: {
                filters: {
                    period: {
                        start_datetime: input.start_datetime,
                        end_datetime: input.end_datetime
                    }
                }
            },
            retries: 3
        });

        const raw = response.data;

        if (!raw || typeof raw !== 'object' || !('data' in raw)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The API returned an unexpected response shape.'
            });
        }

        const providerResponse = z
            .object({
                data: z
                    .object({
                        data: z
                            .array(
                                z.object({
                                    name: z.string(),
                                    type: z.string(),
                                    value: z.union([z.number(), z.string(), z.null()]).optional(),
                                    delta: z.union([z.number(), z.null()]).optional()
                                })
                            )
                            .optional()
                    })
                    .optional(),
                meta: z
                    .object({
                        start_datetime: z.string().optional().nullable(),
                        end_datetime: z.string().optional().nullable(),
                        previous_start_datetime: z.string().optional().nullable(),
                        previous_end_datetime: z.string().optional().nullable()
                    })
                    .optional()
                    .nullable()
            })
            .parse(raw);

        const stats = providerResponse.data;
        const meta = providerResponse.meta;

        return {
            data:
                stats?.data?.map((item) => ({
                    name: item.name,
                    type: item.type,
                    value: item.value ?? null,
                    delta: item.delta ?? null
                })) ?? [],
            meta: {
                ...(meta?.start_datetime != null && {
                    start_datetime: meta.start_datetime
                }),
                ...(meta?.end_datetime != null && {
                    end_datetime: meta.end_datetime
                }),
                ...(meta?.previous_start_datetime != null && {
                    previous_start_datetime: meta.previous_start_datetime
                }),
                ...(meta?.previous_end_datetime != null && {
                    previous_end_datetime: meta.previous_end_datetime
                })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
