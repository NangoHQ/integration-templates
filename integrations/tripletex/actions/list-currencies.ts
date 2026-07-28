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
        const from = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(from)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid integer offset'
            });
        }

        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/currency',
            params: {
                from: String(from),
                count: '100'
            },
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);
        const items = listResponse.values.map((item) => CurrencySchema.parse(item));

        const total = listResponse.fullResultSize ?? 0;
        const currentFrom = listResponse.from ?? 0;
        const currentCount = listResponse.count ?? items.length;
        const nextFrom = currentFrom + currentCount;
        const nextCursor = nextFrom < total ? String(nextFrom) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
