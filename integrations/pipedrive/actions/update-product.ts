import { z } from 'zod';
import { createAction } from 'nango';

const PriceSchema = z.object({
    currency: z.string(),
    price: z.number(),
    cost: z.number().optional(),
    direct_cost: z.number().optional()
});

const InputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    code: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    unit: z.string().nullable().optional(),
    tax: z.number().optional(),
    category: z.number().nullable().optional(),
    owner_id: z.number().optional(),
    is_linkable: z.boolean().optional(),
    visible_to: z.number().optional(),
    prices: z.array(PriceSchema).optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
    billing_frequency: z.enum(['one-time', 'annually', 'semi-annually', 'quarterly', 'monthly', 'weekly']).nullable().optional(),
    billing_frequency_cycles: z.number().nullable().optional()
});

const ProviderProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    code: z.unknown().optional(),
    description: z.unknown().optional(),
    unit: z.unknown().optional(),
    tax: z.unknown().optional(),
    category: z.unknown().optional(),
    owner_id: z.unknown().optional(),
    is_linkable: z.unknown().optional(),
    visible_to: z.unknown().optional(),
    prices: z.array(z.unknown()).optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
    billing_frequency: z.unknown().optional(),
    billing_frequency_cycles: z.unknown().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderProductSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    code: z.unknown().optional(),
    description: z.unknown().optional(),
    unit: z.unknown().optional(),
    tax: z.unknown().optional(),
    category: z.unknown().optional(),
    owner_id: z.unknown().optional(),
    is_linkable: z.unknown().optional(),
    visible_to: z.unknown().optional(),
    prices: z.array(z.unknown()).optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
    billing_frequency: z.unknown().optional(),
    billing_frequency_cycles: z.unknown().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const action = createAction({
    description: 'Update a product in Pipedrive.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.name !== undefined) {
            updateData['name'] = input.name;
        }
        if (input.code !== undefined) {
            updateData['code'] = input.code;
        }
        if (input.description !== undefined) {
            updateData['description'] = input.description;
        }
        if (input.unit !== undefined) {
            updateData['unit'] = input.unit;
        }
        if (input.tax !== undefined) {
            updateData['tax'] = input.tax;
        }
        if (input.category !== undefined) {
            updateData['category'] = input.category;
        }
        if (input.owner_id !== undefined) {
            updateData['owner_id'] = input.owner_id;
        }
        if (input.is_linkable !== undefined) {
            updateData['is_linkable'] = input.is_linkable;
        }
        if (input.visible_to !== undefined) {
            updateData['visible_to'] = input.visible_to;
        }
        if (input.prices !== undefined) {
            updateData['prices'] = input.prices;
        }
        if (input.custom_fields !== undefined) {
            updateData['custom_fields'] = input.custom_fields;
        }
        if (input.billing_frequency !== undefined) {
            updateData['billing_frequency'] = input.billing_frequency;
        }
        if (input.billing_frequency_cycles !== undefined) {
            updateData['billing_frequency_cycles'] = input.billing_frequency_cycles;
        }

        // https://developers.pipedrive.com/docs/api/v1/Products#updateProduct
        const response = await nango.put({
            endpoint: `/v1/products/${input.id}`,
            data: updateData,
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found or update failed',
                product_id: input.id
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const product = parsed.data;

        return {
            id: product.id,
            name: product.name,
            ...(product.code !== undefined && { code: product.code }),
            ...(product.description !== undefined && { description: product.description }),
            ...(product.unit !== undefined && { unit: product.unit }),
            ...(product.tax !== undefined && { tax: product.tax }),
            ...(product.category !== undefined && { category: product.category }),
            ...(product.owner_id !== undefined && { owner_id: product.owner_id }),
            ...(product.is_linkable !== undefined && { is_linkable: product.is_linkable }),
            ...(product.visible_to !== undefined && { visible_to: product.visible_to }),
            ...(product.prices !== undefined && { prices: product.prices }),
            ...(product.custom_fields !== undefined && { custom_fields: product.custom_fields }),
            ...(product.billing_frequency !== undefined && { billing_frequency: product.billing_frequency }),
            ...(product.billing_frequency_cycles !== undefined && { billing_frequency_cycles: product.billing_frequency_cycles }),
            ...(product.add_time !== undefined && { add_time: product.add_time }),
            ...(product.update_time !== undefined && { update_time: product.update_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
