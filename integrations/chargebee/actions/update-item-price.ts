import { z } from 'zod';
import { createAction } from 'nango';

const TierSchema = z.object({
    starting_unit: z.number().optional(),
    ending_unit: z.number().nullable().optional(),
    price: z.number().optional()
});

const InputSchema = z.object({
    id: z.string().describe('Item price ID. Example: "basic-plan-monthly"'),
    name: z.string().optional().describe('Name of the item price.'),
    description: z.string().nullable().optional().describe('Description of the item price.'),
    price: z.number().optional().describe('Price in minor units (cents). Example: 1900'),
    status: z.enum(['active', 'archived']).optional().describe('Status of the item price.'),
    tiers: z.array(TierSchema).optional().describe('Tiered pricing details.')
});

const ProviderItemPriceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    status: z.enum(['active', 'archived', 'deleted']).optional(),
    price: z.number().optional(),
    item_id: z.string().optional(),
    item_family_id: z.string().optional(),
    pricing_model: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    created_at: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['active', 'archived', 'deleted']).optional(),
    price: z.number().optional(),
    item_id: z.string().optional(),
    item_family_id: z.string().optional(),
    pricing_model: z.string().optional(),
    resource_version: z.number().optional(),
    updated_at: z.number().optional(),
    created_at: z.number().optional()
});

const action = createAction({
    description: 'Update an item price (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.name !== undefined) {
            params['name'] = input.name;
        }
        if (input.description !== undefined && input.description !== null) {
            params['description'] = input.description;
        }
        if (input.price !== undefined) {
            params['price'] = input.price;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.tiers !== undefined) {
            for (let i = 0; i < input.tiers.length; i++) {
                const tier = input.tiers[i];
                if (tier === undefined) {
                    continue;
                }
                if (tier.starting_unit !== undefined) {
                    params[`tiers[starting_unit][${i}]`] = tier.starting_unit;
                }
                if (tier.ending_unit !== undefined && tier.ending_unit !== null) {
                    params[`tiers[ending_unit][${i}]`] = tier.ending_unit;
                }
                if (tier.price !== undefined) {
                    params[`tiers[price][${i}]`] = tier.price;
                }
            }
        }

        const response = await nango.post({
            // https://apidocs.chargebee.com/docs/api/item_prices?prod_cat=2#update_an_item_price
            endpoint: `/api/v2/item_prices/${encodeURIComponent(input.id)}`,
            params,
            retries: 3
        });

        const wrapper = z
            .object({
                item_price: z.unknown()
            })
            .parse(response.data);

        const itemPrice = ProviderItemPriceSchema.parse(wrapper.item_price);

        return {
            id: itemPrice.id,
            ...(itemPrice.name !== undefined && { name: itemPrice.name }),
            ...(itemPrice.description != null && { description: itemPrice.description }),
            ...(itemPrice.status !== undefined && { status: itemPrice.status }),
            ...(itemPrice.price !== undefined && { price: itemPrice.price }),
            ...(itemPrice.item_id !== undefined && { item_id: itemPrice.item_id }),
            ...(itemPrice.item_family_id !== undefined && { item_family_id: itemPrice.item_family_id }),
            ...(itemPrice.pricing_model !== undefined && { pricing_model: itemPrice.pricing_model }),
            ...(itemPrice.resource_version !== undefined && { resource_version: itemPrice.resource_version }),
            ...(itemPrice.updated_at !== undefined && { updated_at: itemPrice.updated_at }),
            ...(itemPrice.created_at !== undefined && { created_at: itemPrice.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
