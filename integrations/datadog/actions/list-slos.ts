import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('The number of SLOs to return in the response. Default: 1000.')
});

const CreatorSchema = z.object({
    email: z.string().optional(),
    handle: z.string().optional(),
    name: z.string().nullable().optional()
});

const SLOThresholdSchema = z.object({
    target: z.number(),
    target_display: z.string().optional(),
    timeframe: z.string(),
    warning: z.number().optional(),
    warning_display: z.string().optional()
});

const SLOQuerySchema = z.object({
    denominator: z.string(),
    numerator: z.string()
});

const ServiceLevelObjectiveSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    created_at: z.number().optional(),
    modified_at: z.number().optional(),
    creator: CreatorSchema.optional(),
    tags: z.array(z.string()).optional(),
    type: z.string(),
    thresholds: z.array(SLOThresholdSchema).optional(),
    query: SLOQuerySchema.optional(),
    monitor_ids: z.array(z.number()).optional(),
    monitor_tags: z.array(z.string()).optional(),
    groups: z.array(z.string()).optional(),
    target_threshold: z.number().optional(),
    warning_threshold: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(ServiceLevelObjectiveSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()).optional(),
    errors: z.array(z.string()).optional(),
    metadata: z
        .object({
            page: z
                .object({
                    total_count: z.number().optional(),
                    total_filtered_count: z.number().optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'List Service Level Objectives.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid cursor value.'
            });
        }

        const limit = input.limit ?? 1000;

        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/service-level-objectives/#get-all-slos
            endpoint: 'v1/slo',
            params: {
                limit: String(limit),
                ...(input.cursor !== undefined && { offset: String(offset) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawData = ProviderResponseSchema.parse(response.data);

        if (rawData.errors && rawData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: rawData.errors.join(', ')
            });
        }

        const dataArray = rawData.data ?? [];

        const items = dataArray.map((item: unknown) => {
            const parsed = ServiceLevelObjectiveSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse SLO item from response.',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        const totalFiltered = rawData.metadata?.page?.total_filtered_count ?? 0;
        const nextOffset = offset + items.length;
        const next_cursor = nextOffset < totalFiltered ? String(nextOffset) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
