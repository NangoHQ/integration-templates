import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('The ID of the product. Example: 123')
});

const PriceSchema = z.object({
    currency: z.string(),
    price: z.number(),
    cost: z.number().optional().nullable(),
    direct_cost: z.number().optional().nullable()
});

const OwnerSchema = z
    .object({
        id: z.number().int(),
        name: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const ProviderProductSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    code: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    unit: z.string().optional().nullable(),
    tax: z.number().optional().nullable(),
    category: z.number().optional().nullable(),
    owner_id: z.union([z.number().int(), OwnerSchema]).optional().nullable(),
    is_linkable: z.boolean().optional().nullable(),
    visible_to: z.union([z.number(), z.string()]).optional().nullable(),
    prices: z.array(PriceSchema).optional().nullable(),
    custom_fields: z.record(z.string(), z.unknown()).optional().nullable(),
    billing_frequency: z.string().optional().nullable(),
    billing_frequency_cycles: z.number().int().optional().nullable(),
    add_time: z.string().optional().nullable(),
    update_time: z.string().optional().nullable()
});

const OwnerOutputSchema = z
    .object({
        id: z.number().int(),
        name: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    tax: z.number().optional(),
    category: z.number().optional(),
    owner_id: z.union([z.number().int(), OwnerOutputSchema]).optional(),
    is_linkable: z.boolean().optional(),
    visible_to: z.union([z.number(), z.string()]).optional(),
    prices: z.array(PriceSchema).optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
    billing_frequency: z.string().optional(),
    billing_frequency_cycles: z.number().int().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single product from Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Products#getProduct
        const response = await nango.get({
            endpoint: `/v1/products/${input.id}`,
            retries: 3
        });

        const responseData = response.data;

        if (!responseData || typeof responseData !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Product with ID ${input.id} not found`
            });
        }

        const dataProperty = 'data' in responseData ? responseData.data : undefined;

        if (!dataProperty || typeof dataProperty !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Product with ID ${input.id} not found`
            });
        }

        const providerProduct = ProviderProductSchema.parse(dataProperty);

        return {
            id: providerProduct.id,
            name: providerProduct.name,
            ...(providerProduct.code != null && { code: providerProduct.code }),
            ...(providerProduct.description != null && { description: providerProduct.description }),
            ...(providerProduct.unit != null && { unit: providerProduct.unit }),
            ...(providerProduct.tax != null && { tax: providerProduct.tax }),
            ...(providerProduct.category != null && { category: providerProduct.category }),
            ...(providerProduct.owner_id != null && { owner_id: providerProduct.owner_id }),
            ...(providerProduct.is_linkable != null && { is_linkable: providerProduct.is_linkable }),
            ...(providerProduct.visible_to != null && { visible_to: providerProduct.visible_to }),
            ...(providerProduct.prices != null && { prices: providerProduct.prices }),
            ...(providerProduct.custom_fields != null && { custom_fields: providerProduct.custom_fields }),
            ...(providerProduct.billing_frequency != null && { billing_frequency: providerProduct.billing_frequency }),
            ...(providerProduct.billing_frequency_cycles != null && { billing_frequency_cycles: providerProduct.billing_frequency_cycles }),
            ...(providerProduct.add_time != null && { add_time: providerProduct.add_time }),
            ...(providerProduct.update_time != null && { update_time: providerProduct.update_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
