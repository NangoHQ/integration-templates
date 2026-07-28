import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderProductSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string().nullish(),
    number: z.string().nullish(),
    displayNumber: z.string().nullish(),
    description: z.string().nullish(),
    orderLineDescription: z.string().nullish(),
    ean: z.string().nullish(),
    costExcludingVatCurrency: z.number().nullish(),
    expenses: z.number().nullish(),
    priceExcludingVatCurrency: z.number().nullish(),
    priceIncludingVatCurrency: z.number().nullish(),
    isInactive: z.boolean().nullish(),
    isStockItem: z.boolean().nullish(),
    weight: z.number().nullish(),
    volume: z.number().nullish()
});

const ProviderListResponseSchema = z.object({
    fullResultSize: z.number().optional(),
    from: z.number().optional(),
    count: z.number().optional(),
    versionDigest: z.string().optional(),
    values: z.array(ProviderProductSchema.passthrough())
});

const ProductSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    number: z.string().optional(),
    displayNumber: z.string().optional(),
    description: z.string().optional(),
    orderLineDescription: z.string().optional(),
    ean: z.string().optional(),
    costExcludingVatCurrency: z.number().optional(),
    expenses: z.number().optional(),
    priceExcludingVatCurrency: z.number().optional(),
    priceIncludingVatCurrency: z.number().optional(),
    isInactive: z.boolean().optional(),
    isStockItem: z.boolean().optional(),
    weight: z.number().optional(),
    volume: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(ProductSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List products.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string.'
            });
        }
        const pageSize = 100;
        const from = input.cursor ? Number(input.cursor) : 0;

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: 'v2/product',
            params: {
                from: String(from),
                count: String(pageSize)
            },
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);
        const items = listResponse.values.map((item) => ({
            id: String(item.id),
            ...(item.name != null && { name: item.name }),
            ...(item.number != null && { number: item.number }),
            ...(item.displayNumber != null && { displayNumber: item.displayNumber }),
            ...(item.description != null && { description: item.description }),
            ...(item.orderLineDescription != null && { orderLineDescription: item.orderLineDescription }),
            ...(item.ean != null && { ean: item.ean }),
            ...(item.costExcludingVatCurrency != null && { costExcludingVatCurrency: item.costExcludingVatCurrency }),
            ...(item.expenses != null && { expenses: item.expenses }),
            ...(item.priceExcludingVatCurrency != null && { priceExcludingVatCurrency: item.priceExcludingVatCurrency }),
            ...(item.priceIncludingVatCurrency != null && { priceIncludingVatCurrency: item.priceIncludingVatCurrency }),
            ...(item.isInactive != null && { isInactive: item.isInactive }),
            ...(item.isStockItem != null && { isStockItem: item.isStockItem }),
            ...(item.weight != null && { weight: item.weight }),
            ...(item.volume != null && { volume: item.volume })
        }));

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
