import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    hookId: z.number().describe('The ID of the webhook. Example: 3329421'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().positive().optional().describe('Maximum number of results per page.')
});

const ProviderIncomingSchema = z.object({
    id: z.string(),
    scope: z.string(),
    size: z.number(),
    created: z.string().optional(),
    data: z.object({}).passthrough().optional()
});

const ProviderPgSchema = z.object({
    last: z.string().optional(),
    showLast: z.boolean().optional(),
    sortBy: z.string().optional(),
    sortDir: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional()
});

const ProviderResponseSchema = z.object({
    incomings: z.array(ProviderIncomingSchema),
    pg: ProviderPgSchema.optional()
});

const IncomingSchema = z.object({
    id: z.string(),
    scope: z.string(),
    size: z.number(),
    created: z.string().optional(),
    data: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    incomings: z.array(IncomingSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List queued webhook payloads waiting for processing by a scenario.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let offset: number | undefined;
        if (input.cursor !== undefined) {
            offset = parseInt(input.cursor, 10);
            if (!Number.isInteger(offset) || offset < 0 || String(offset) !== input.cursor.trim()) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a valid non-negative integer offset string'
                });
            }
        }

        // https://developers.make.com/api-documentation/
        const response = await nango.get({
            endpoint: `/hooks/${encodeURIComponent(String(input.hookId))}/incomings`,
            params: {
                ...(offset !== undefined && { 'pg[offset]': offset }),
                ...(input.limit !== undefined && { 'pg[limit]': String(input.limit) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            incomings: parsed.incomings.map((item) => ({
                id: item.id,
                scope: item.scope,
                size: item.size,
                ...(item.created !== undefined && { created: item.created }),
                ...(item.data !== undefined && { data: item.data })
            })),
            ...(parsed.pg?.last !== undefined && { nextCursor: parsed.pg.last })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
