import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Product ID. Example: 69781078'),
    name: z.string().optional(),
    number: z.string().optional(),
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
    weightUnit: z.string().optional(),
    volume: z.number().optional(),
    volumeUnit: z.string().optional(),
    hsnCode: z.string().optional()
});

const ProviderProductSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    name: z.string().optional(),
    number: z.string().optional(),
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
    weightUnit: z.string().optional(),
    volume: z.number().optional(),
    volumeUnit: z.string().optional(),
    hsnCode: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderProductSchema
});

const OutputSchema = ProviderProductSchema;

const action = createAction({
    description: 'Update a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/product/${encodeURIComponent(String(input.id))}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.number !== undefined && { number: input.number }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.orderLineDescription !== undefined && { orderLineDescription: input.orderLineDescription }),
                ...(input.ean !== undefined && { ean: input.ean }),
                ...(input.costExcludingVatCurrency !== undefined && { costExcludingVatCurrency: input.costExcludingVatCurrency }),
                ...(input.expenses !== undefined && { expenses: input.expenses }),
                ...(input.priceExcludingVatCurrency !== undefined && { priceExcludingVatCurrency: input.priceExcludingVatCurrency }),
                ...(input.priceIncludingVatCurrency !== undefined && { priceIncludingVatCurrency: input.priceIncludingVatCurrency }),
                ...(input.isInactive !== undefined && { isInactive: input.isInactive }),
                ...(input.isStockItem !== undefined && { isStockItem: input.isStockItem }),
                ...(input.weight !== undefined && { weight: input.weight }),
                ...(input.weightUnit !== undefined && { weightUnit: input.weightUnit }),
                ...(input.volume !== undefined && { volume: input.volume }),
                ...(input.volumeUnit !== undefined && { volumeUnit: input.volumeUnit }),
                ...(input.hsnCode !== undefined && { hsnCode: input.hsnCode })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return providerResponse.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
