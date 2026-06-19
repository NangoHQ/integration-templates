import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier for the item price. Example: "basic-plan-yearly"'),
    name: z.string().describe('Display name for the item price. Example: "Basic Plan Yearly"'),
    item_id: z.string().describe('ID of the item to price. Example: "basic-plan"'),
    pricing_model: z.enum(['flat_fee', 'per_unit', 'tiered', 'volume', 'stairstep']).describe('Pricing model for the item price.'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    period: z.number().describe('Billing period length. Example: 1'),
    period_unit: z.enum(['day', 'week', 'month', 'year']).describe('Unit of the billing period.'),
    price: z.number().optional().describe('Price in minor currency units (cents). Required for flat_fee and per_unit.'),
    description: z.string().optional(),
    external_name: z.string().optional(),
    free_quantity: z.number().optional(),
    trial_period: z.number().optional(),
    trial_period_unit: z.enum(['day', 'month']).optional(),
    is_taxable: z.boolean().optional()
});

const ProviderItemPriceSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    item_id: z.string().optional(),
    item_type: z.string().optional(),
    pricing_model: z.string().optional(),
    currency_code: z.string().optional(),
    period: z.number().optional(),
    period_unit: z.string().optional(),
    price: z.number().optional(),
    status: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    resource_version: z.number().optional(),
    external_name: z.string().optional(),
    description: z.string().optional(),
    free_quantity: z.number().optional(),
    is_taxable: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    item_id: z.string().optional(),
    pricing_model: z.string().optional(),
    currency_code: z.string().optional(),
    period: z.number().optional(),
    period_unit: z.string().optional(),
    price: z.number().optional(),
    status: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    resource_version: z.number().optional(),
    external_name: z.string().optional(),
    description: z.string().optional(),
    free_quantity: z.number().optional(),
    is_taxable: z.boolean().optional()
});

const action = createAction({
    description: 'Create an item price (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/create-item-price',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((input.pricing_model === 'flat_fee' || input.pricing_model === 'per_unit') && input.price === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'price is required for flat_fee and per_unit pricing models.'
            });
        }

        const response = await nango.post({
            // https://apidocs.chargebee.com/docs/api/item_prices/create-an-item-price
            endpoint: '/api/v2/item_prices',
            params: {
                id: input.id,
                name: input.name,
                item_id: input.item_id,
                pricing_model: input.pricing_model,
                currency_code: input.currency_code,
                period: String(input.period),
                period_unit: input.period_unit,
                ...(input.price !== undefined && { price: String(input.price) }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.external_name !== undefined && { external_name: input.external_name }),
                ...(input.free_quantity !== undefined && { free_quantity: String(input.free_quantity) }),
                ...(input.trial_period !== undefined && { trial_period: String(input.trial_period) }),
                ...(input.trial_period_unit !== undefined && { trial_period_unit: input.trial_period_unit }),
                ...(input.is_taxable !== undefined && { is_taxable: String(input.is_taxable) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                item_price: ProviderItemPriceSchema
            })
            .parse(response.data);

        const itemPrice = providerResponse.item_price;

        return {
            id: itemPrice.id,
            ...(itemPrice.name !== undefined && { name: itemPrice.name }),
            ...(itemPrice.item_id !== undefined && { item_id: itemPrice.item_id }),
            ...(itemPrice.pricing_model !== undefined && { pricing_model: itemPrice.pricing_model }),
            ...(itemPrice.currency_code !== undefined && { currency_code: itemPrice.currency_code }),
            ...(itemPrice.period !== undefined && { period: itemPrice.period }),
            ...(itemPrice.period_unit !== undefined && { period_unit: itemPrice.period_unit }),
            ...(itemPrice.price !== undefined && { price: itemPrice.price }),
            ...(itemPrice.status !== undefined && { status: itemPrice.status }),
            ...(itemPrice.created_at !== undefined && { created_at: itemPrice.created_at }),
            ...(itemPrice.updated_at !== undefined && { updated_at: itemPrice.updated_at }),
            ...(itemPrice.resource_version !== undefined && { resource_version: itemPrice.resource_version }),
            ...(itemPrice.external_name !== undefined && { external_name: itemPrice.external_name }),
            ...(itemPrice.description !== undefined && { description: itemPrice.description }),
            ...(itemPrice.free_quantity !== undefined && { free_quantity: itemPrice.free_quantity }),
            ...(itemPrice.is_taxable !== undefined && { is_taxable: itemPrice.is_taxable })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
