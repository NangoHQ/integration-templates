import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderProductSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
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
        const pageSize = 100;
        const from = input.cursor ? parseInt(input.cursor, 10) : 0;

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
            ...(item.name !== undefined && { name: item.name }),
            ...(item.number !== undefined && { number: item.number }),
            ...(item.displayNumber !== undefined && { displayNumber: item.displayNumber }),
            ...(item.description !== undefined && { description: item.description }),
            ...(item.orderLineDescription !== undefined && { orderLineDescription: item.orderLineDescription }),
            ...(item.ean !== undefined && { ean: item.ean }),
            ...(item.costExcludingVatCurrency !== undefined && { costExcludingVatCurrency: item.costExcludingVatCurrency }),
            ...(item.expenses !== undefined && { expenses: item.expenses }),
            ...(item.priceExcludingVatCurrency !== undefined && { priceExcludingVatCurrency: item.priceExcludingVatCurrency }),
            ...(item.priceIncludingVatCurrency !== undefined && { priceIncludingVatCurrency: item.priceIncludingVatCurrency }),
            ...(item.isInactive !== undefined && { isInactive: item.isInactive }),
            ...(item.isStockItem !== undefined && { isStockItem: item.isStockItem }),
            ...(item.weight !== undefined && { weight: item.weight }),
            ...(item.volume !== undefined && { volume: item.volume })
        }));

        const currentFrom = listResponse.from ?? from;
        const currentCount = listResponse.count ?? pageSize;
        const fullResultSize = listResponse.fullResultSize ?? 0;
        const nextCursor = currentFrom + currentCount < fullResultSize ? String(currentFrom + currentCount) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
