import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_price_id: z.string().describe('The ID of the item price to retrieve. Example: "basic-plan-monthly"')
});

const ProviderItemPriceSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        item_family_id: z.string().optional(),
        item_id: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        external_name: z.string().optional(),
        price_variant_id: z.string().optional(),
        proration_type: z.string().optional(),
        pricing_model: z.string(),
        price: z.number().optional(),
        price_in_decimal: z.string().optional(),
        period: z.number().optional(),
        currency_code: z.string(),
        period_unit: z.string().optional(),
        trial_period: z.number().optional(),
        trial_period_unit: z.string().optional(),
        trial_end_action: z.string().optional(),
        shipping_period: z.number().optional(),
        shipping_period_unit: z.string().optional(),
        billing_cycles: z.number().optional(),
        free_quantity: z.number().optional(),
        free_quantity_in_decimal: z.string().optional(),
        channel: z.string().optional(),
        resource_version: z.number().optional(),
        updated_at: z.number().optional(),
        created_at: z.number(),
        usage_accumulation_reset_frequency: z.string().optional(),
        archived_at: z.number().optional(),
        invoice_notes: z.string().optional(),
        is_taxable: z.boolean().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        item_type: z.string().optional(),
        show_description_in_invoices: z.boolean().optional(),
        show_description_in_quotes: z.boolean().optional(),
        deleted: z.boolean(),
        business_entity_id: z.string().optional(),
        tiers: z.array(z.record(z.string(), z.unknown())).optional(),
        tax_detail: z.record(z.string(), z.unknown()).optional(),
        tax_providers_fields: z.array(z.record(z.string(), z.unknown())).optional(),
        accounting_detail: z.record(z.string(), z.unknown()).optional(),
        object: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderItemPriceSchema;

const action = createAction({
    description: 'Retrieve a single item price by ID (Product Catalog 2.0).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/item_prices/retrieve-an-item-price
            endpoint: `/api/v2/item_prices/${encodeURIComponent(input.item_price_id)}`,
            retries: 3
        });

        const providerResponse = z
            .object({
                item_price: ProviderItemPriceSchema
            })
            .parse(response.data);

        return providerResponse.item_price;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
