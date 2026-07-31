import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    orderDateFrom: z.string().optional().describe('Filter start date (YYYY-MM-DD). Defaults to a wide past date for a full snapshot.'),
    orderDateTo: z.string().optional().describe('Filter end date (YYYY-MM-DD). Defaults to a wide future date for a full snapshot.'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.')
});

const OrderSchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const ProviderListResponseSchema = z.object({
    fullResultSize: z.number(),
    from: z.number(),
    count: z.number(),
    values: z.array(OrderSchema)
});

const OutputSchema = z.object({
    items: z.array(z.unknown()),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List orders within a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orderDateFrom = input.orderDateFrom ?? '2000-01-01';
        const orderDateTo = input.orderDateTo ?? '2099-12-31';
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string.'
            });
        }
        const from = input.cursor !== undefined ? Number(input.cursor) : 0;

        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/order',
            params: {
                orderDateFrom,
                orderDateTo,
                from: String(from),
                count: '100'
            },
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);
        const hasMore = listResponse.from + listResponse.count < listResponse.fullResultSize;
        const nextCursor = hasMore ? String(listResponse.from + listResponse.count) : undefined;

        return {
            items: listResponse.values,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
