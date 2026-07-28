import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset). Omit for the first page.')
});

const CurrencySchema = z
    .object({
        id: z.number(),
        version: z.number().optional(),
        url: z.string().optional(),
        code: z.string(),
        description: z.string().optional(),
        factor: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CurrencySchema),
    nextCursor: z.string().optional()
});

const ListResponseSchema = z.object({
    fullResultSize: z.number().optional(),
    from: z.number().optional(),
    count: z.number().optional(),
    values: z.array(z.unknown())
});

const action = createAction({
    description: 'List currencies.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string.'
            });
        }
        const pageSize = 100;
        const from = input.cursor ? Number(input.cursor) : 0;

        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/currency',
            params: {
                from: String(from),
                count: String(pageSize)
            },
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);
        const items = listResponse.values.map((item) => CurrencySchema.parse(item));

        const currentFrom = listResponse.from ?? from;
        const currentCount = listResponse.count ?? items.length;
        const nextFrom = currentFrom + currentCount;
        const hasMore = listResponse.fullResultSize != null ? nextFrom < listResponse.fullResultSize : items.length === pageSize;
        const nextCursor = hasMore ? String(nextFrom) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
