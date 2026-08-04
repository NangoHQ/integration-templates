import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Search query following log search syntax. Example: "*"'),
    from: z.string().optional().describe('Start of the time range. Example: "now-15m"'),
    to: z.string().optional().describe('End of the time range. Example: "now"'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of logs to return. Example: 25'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response. Example: "eyJhZnRlciI6..."'),
    sort: z.enum(['timestamp', '-timestamp']).optional().describe('Sort order. Example: "timestamp" or "-timestamp"')
});

const ProviderLogAttributeSchema = z.object({
    status: z.string().optional(),
    service: z.string().optional(),
    tags: z.array(z.string()).optional(),
    timestamp: z.string().optional(),
    host: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    message: z.string().optional()
});

const ProviderLogSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    attributes: ProviderLogAttributeSchema.optional()
});

const ProviderMetaPageSchema = z.object({
    after: z.string().optional()
});

const ProviderMetaSchema = z.object({
    page: ProviderMetaPageSchema.optional(),
    status: z.string().optional(),
    elapsed: z.number().optional(),
    request_id: z.string().optional(),
    warnings: z.array(z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderLogSchema).optional(),
    meta: ProviderMetaSchema.optional()
});

const OutputSchema = z.object({
    logs: z.array(ProviderLogSchema),
    next_cursor: z.string().optional(),
    status: z.string().optional(),
    elapsed: z.number().optional(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Search ingested log events within a time range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['logs_read_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/logs/#search-logs-post
            endpoint: 'v2/logs/events/search',
            data: {
                filter: {
                    query: input.query ?? '*',
                    from: input.from ?? 'now-15m',
                    to: input.to ?? 'now'
                },
                page: {
                    limit: input.limit ?? 25,
                    ...(input.cursor !== undefined && { cursor: input.cursor })
                },
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            logs: providerResponse.data ?? [],
            ...(providerResponse.meta?.page?.after !== undefined && { next_cursor: providerResponse.meta.page.after }),
            ...(providerResponse.meta?.status !== undefined && { status: providerResponse.meta.status }),
            ...(providerResponse.meta?.elapsed !== undefined && { elapsed: providerResponse.meta.elapsed }),
            ...(providerResponse.meta?.request_id !== undefined && { request_id: providerResponse.meta.request_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
