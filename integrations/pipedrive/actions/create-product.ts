import { z } from 'zod';
import { createAction } from 'nango';

const PriceSchema = z.object({
    currency: z.string(),
    price: z.number(),
    cost: z.number().optional(),
    direct_cost: z.number().optional()
});

const InputSchema = z.object({
    name: z.string().min(1).describe('The name of the product. Cannot be an empty string.'),
    code: z.string().optional().describe('The product code.'),
    description: z.string().optional().describe('The product description.'),
    unit: z.string().optional().describe('The unit in which this product is sold.'),
    tax: z.number().optional().describe('The tax percentage.'),
    category: z.number().optional().describe('The category of the product.'),
    owner_id: z.number().optional().describe('The ID of the user who will be marked as the owner of this product.'),
    is_linkable: z.boolean().optional().describe('Whether this product can be added to a deal or not.'),
    visible_to: z.number().optional().describe('The visibility of the product.'),
    prices: z.array(PriceSchema).optional().describe('An array of price objects.'),
    custom_fields: z.object({}).passthrough().optional().describe('Custom fields object.'),
    billing_frequency: z.string().optional().describe('How often a customer is billed.'),
    billing_frequency_cycles: z.number().optional().describe('The number of times the billing frequency repeats.')
});

const ProviderProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    code: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    unit: z.string().nullable().optional(),
    tax: z.number().nullable().optional(),
    category: z.number().nullable().optional(),
    owner_id: z
        .union([z.number(), z.object({}).passthrough()])
        .nullable()
        .optional(),
    is_linkable: z.boolean().nullable().optional(),
    visible_to: z.union([z.number(), z.string()]).nullable().optional(),
    add_time: z.string().nullable().optional(),
    update_time: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    tax: z.number().optional(),
    category: z.number().optional(),
    owner_id: z.number().optional(),
    is_linkable: z.boolean().optional(),
    visible_to: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const action = createAction({
    description: 'Create a product in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pipedrive.com/docs/api/v1/Products#addProduct
            endpoint: '/v1/products',
            data: {
                name: input.name,
                ...(input.code !== undefined && { code: input.code }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.unit !== undefined && { unit: input.unit }),
                ...(input.tax !== undefined && { tax: input.tax }),
                ...(input.category !== undefined && { category: input.category }),
                ...(input.owner_id !== undefined && { owner_id: input.owner_id }),
                ...(input.is_linkable !== undefined && { is_linkable: input.is_linkable }),
                ...(input.visible_to !== undefined && { visible_to: input.visible_to }),
                ...(input.prices !== undefined && { prices: input.prices }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
                ...(input.billing_frequency !== undefined && { billing_frequency: input.billing_frequency }),
                ...(input.billing_frequency_cycles !== undefined && { billing_frequency_cycles: input.billing_frequency_cycles })
            },
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response from Pipedrive API'
            });
        }

        const providerProduct = ProviderProductSchema.parse(response.data.data);

        return {
            id: providerProduct.id,
            name: providerProduct.name,
            ...(providerProduct.code != null && { code: providerProduct.code }),
            ...(providerProduct.description != null && { description: providerProduct.description }),
            ...(providerProduct.unit != null && { unit: providerProduct.unit }),
            ...(providerProduct.tax != null && { tax: providerProduct.tax }),
            ...(providerProduct.category != null && { category: providerProduct.category }),
            ...(providerProduct.owner_id != null && typeof providerProduct.owner_id === 'number' && { owner_id: providerProduct.owner_id }),
            ...(providerProduct.is_linkable != null && { is_linkable: providerProduct.is_linkable }),
            ...(providerProduct.visible_to != null && typeof providerProduct.visible_to === 'number' && { visible_to: providerProduct.visible_to }),
            ...(providerProduct.add_time != null && { add_time: providerProduct.add_time }),
            ...(providerProduct.update_time != null && { update_time: providerProduct.update_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
