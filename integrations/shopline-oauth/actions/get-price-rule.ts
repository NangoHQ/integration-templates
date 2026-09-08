import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        price_rule_id: z.string().describe('The unique identifier of the price rule to retrieve.')
    })
    .describe('Input for retrieving a single price rule by ID.');

const VariantEntitlementSchema = z
    .object({
        product_id: z.string().describe('Product ID of the entitled or prerequisite variant.'),
        variant_id: z.string().describe('Variant ID of the entitled or prerequisite variant.')
    })
    .describe('A product/variant ID pair the provider uses to reference a specific variant.');

const RawPriceRuleSchema = z
    .object({
        id: z.string().describe('Unique identifier of the price rule.'),
        title: z.string().describe('Title of the price rule.'),
        value_type: z.string().describe('Type of discount value, e.g. "percentage" or "fixed_amount".'),
        value: z.string().describe('Discount value amount.'),
        target_type: z.string().describe('Target type of the discount, e.g. "line_item" or "shipping_line".'),
        target_selection: z.string().describe('Target selection criteria, e.g. "all" or "entitled".'),
        allocation_method: z.string().describe('Allocation method for the discount, e.g. "across" or "each".'),
        starts_at: z.string().describe('Start date and time of the price rule in ISO 8601 format.'),
        ends_at: z.string().nullable().optional().describe('End date and time of the price rule in ISO 8601 format. Omitted if the rule does not expire.'),
        usage_limit: z.number().nullable().optional().describe('Maximum number of times the price rule can be used in total.'),
        usage_per_customer: z.number().nullable().optional().describe('Maximum number of times the price rule can be used by a single customer.'),
        entitled_product_ids: z.array(z.string()).nullable().optional().describe('Product IDs entitled to the discount.'),
        entitled_variant_ids: z.array(VariantEntitlementSchema).nullable().optional().describe('Product/variant ID pairs entitled to the discount.'),
        entitled_collection_ids: z.array(z.string()).nullable().optional().describe('Collection IDs entitled to the discount.'),
        prerequisite_subtotal_range: z.record(z.string(), z.unknown()).nullable().optional().describe('Minimum subtotal prerequisite for the price rule.'),
        prerequisite_quantity_range: z.record(z.string(), z.unknown()).nullable().optional().describe('Minimum quantity prerequisite for the price rule.'),
        prerequisite_shipping_price_range: z.record(z.string(), z.unknown()).nullable().optional().describe('Shipping price prerequisite for the price rule.'),
        prerequisite_to_entitlement_quantity_ratio: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional()
            .describe('Quantity ratio prerequisite for the price rule.'),
        prerequisite_customer_ids: z.array(z.string()).nullable().optional().describe('Customer IDs that must be met as a prerequisite.'),
        prerequisite_product_ids: z.array(z.string()).nullable().optional().describe('Product IDs that must be in the cart as a prerequisite.'),
        prerequisite_variant_ids: z
            .array(VariantEntitlementSchema)
            .nullable()
            .optional()
            .describe('Product/variant ID pairs that must be in the cart as a prerequisite.'),
        prerequisite_collection_ids: z.array(z.string()).nullable().optional().describe('Collection IDs that must be in the cart as a prerequisite.'),
        sales_channels: z
            .array(z.union([z.string(), z.record(z.string(), z.unknown())]))
            .nullable()
            .optional()
            .describe('Sales channels where the price rule applies.'),
        create_at: z.string().nullable().optional().describe('Timestamp when the price rule was created.'),
        update_at: z.string().nullable().optional().describe('Timestamp when the price rule was last updated.')
    })
    .passthrough();

const OutputPriceRuleSchema = z
    .object({
        id: z.string().describe('Unique identifier of the price rule.'),
        title: z.string().describe('Title of the price rule.'),
        value_type: z.string().describe('Type of discount value, e.g. "percentage" or "fixed_amount".'),
        value: z.string().describe('Discount value amount.'),
        target_type: z.string().describe('Target type of the discount, e.g. "line_item" or "shipping_line".'),
        target_selection: z.string().describe('Target selection criteria, e.g. "all" or "entitled".'),
        allocation_method: z.string().describe('Allocation method for the discount, e.g. "across" or "each".'),
        starts_at: z.string().describe('Start date and time of the price rule in ISO 8601 format.'),
        ends_at: z.string().optional().describe('End date and time of the price rule in ISO 8601 format. Omitted if the rule does not expire.'),
        usage_limit: z.number().optional().describe('Maximum number of times the price rule can be used in total.'),
        usage_per_customer: z.number().optional().describe('Maximum number of times the price rule can be used by a single customer.'),
        entitled_product_ids: z.array(z.string()).optional().describe('Product IDs entitled to the discount.'),
        entitled_variant_ids: z.array(VariantEntitlementSchema).optional().describe('Product/variant ID pairs entitled to the discount.'),
        entitled_collection_ids: z.array(z.string()).optional().describe('Collection IDs entitled to the discount.'),
        prerequisite_subtotal_range: z.record(z.string(), z.unknown()).optional().describe('Minimum subtotal prerequisite for the price rule.'),
        prerequisite_quantity_range: z.record(z.string(), z.unknown()).optional().describe('Minimum quantity prerequisite for the price rule.'),
        prerequisite_shipping_price_range: z.record(z.string(), z.unknown()).optional().describe('Shipping price prerequisite for the price rule.'),
        prerequisite_to_entitlement_quantity_ratio: z.record(z.string(), z.unknown()).optional().describe('Quantity ratio prerequisite for the price rule.'),
        prerequisite_customer_ids: z.array(z.string()).optional().describe('Customer IDs that must be met as a prerequisite.'),
        prerequisite_product_ids: z.array(z.string()).optional().describe('Product IDs that must be in the cart as a prerequisite.'),
        prerequisite_variant_ids: z.array(VariantEntitlementSchema).optional().describe('Product/variant ID pairs that must be in the cart as a prerequisite.'),
        prerequisite_collection_ids: z.array(z.string()).optional().describe('Collection IDs that must be in the cart as a prerequisite.'),
        sales_channels: z
            .array(z.union([z.string(), z.record(z.string(), z.unknown())]))
            .optional()
            .describe('Sales channels where the price rule applies.'),
        create_at: z.string().optional().describe('Timestamp when the price rule was created.'),
        update_at: z.string().optional().describe('Timestamp when the price rule was last updated.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        price_rule: OutputPriceRuleSchema.describe('The price rule retrieved from the provider.')
    })
    .describe('Output containing the retrieved price rule.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single price rule from the provider by ID without any mutation.
 * @pitfalls: The provider uses non-standard timestamp field names create_at and update_at instead of the usual created_at and updated_at. entitled_variant_ids and prerequisite_variant_ids are returned as arrays of { product_id, variant_id } object pairs, not plain variant ID strings.
 */
const action = createAction({
    description: 'Retrieve a single price rule by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_price_rules'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/price-rules/get-price-rule
            endpoint: `/admin/openapi/v20260601/sales/price_rules/${encodeURIComponent(input.price_rule_id)}.json`,
            retries: 3
        });

        const data = z
            .object({
                price_rule: z.record(z.string(), z.unknown())
            })
            .parse(response.data);

        const rawPriceRule = RawPriceRuleSchema.parse(data.price_rule);

        const priceRule: z.infer<typeof OutputPriceRuleSchema> = {
            id: rawPriceRule.id,
            title: rawPriceRule.title,
            value_type: rawPriceRule.value_type,
            value: rawPriceRule.value,
            target_type: rawPriceRule.target_type,
            target_selection: rawPriceRule.target_selection,
            allocation_method: rawPriceRule.allocation_method,
            starts_at: rawPriceRule.starts_at,
            ...(rawPriceRule.ends_at != null && { ends_at: rawPriceRule.ends_at }),
            ...(rawPriceRule.usage_limit != null && { usage_limit: rawPriceRule.usage_limit }),
            ...(rawPriceRule.usage_per_customer != null && { usage_per_customer: rawPriceRule.usage_per_customer }),
            ...(rawPriceRule.entitled_product_ids != null && { entitled_product_ids: rawPriceRule.entitled_product_ids }),
            ...(rawPriceRule.entitled_variant_ids != null && { entitled_variant_ids: rawPriceRule.entitled_variant_ids }),
            ...(rawPriceRule.entitled_collection_ids != null && { entitled_collection_ids: rawPriceRule.entitled_collection_ids }),
            ...(rawPriceRule.prerequisite_subtotal_range != null && { prerequisite_subtotal_range: rawPriceRule.prerequisite_subtotal_range }),
            ...(rawPriceRule.prerequisite_quantity_range != null && { prerequisite_quantity_range: rawPriceRule.prerequisite_quantity_range }),
            ...(rawPriceRule.prerequisite_shipping_price_range != null && {
                prerequisite_shipping_price_range: rawPriceRule.prerequisite_shipping_price_range
            }),
            ...(rawPriceRule.prerequisite_to_entitlement_quantity_ratio != null && {
                prerequisite_to_entitlement_quantity_ratio: rawPriceRule.prerequisite_to_entitlement_quantity_ratio
            }),
            ...(rawPriceRule.prerequisite_customer_ids != null && { prerequisite_customer_ids: rawPriceRule.prerequisite_customer_ids }),
            ...(rawPriceRule.prerequisite_product_ids != null && { prerequisite_product_ids: rawPriceRule.prerequisite_product_ids }),
            ...(rawPriceRule.prerequisite_variant_ids != null && { prerequisite_variant_ids: rawPriceRule.prerequisite_variant_ids }),
            ...(rawPriceRule.prerequisite_collection_ids != null && { prerequisite_collection_ids: rawPriceRule.prerequisite_collection_ids }),
            ...(rawPriceRule.sales_channels != null && { sales_channels: rawPriceRule.sales_channels }),
            ...(rawPriceRule.create_at != null && { create_at: rawPriceRule.create_at }),
            ...(rawPriceRule.update_at != null && { update_at: rawPriceRule.update_at })
        };

        // Preserve any unknown fields from the provider response
        for (const [key, value] of Object.entries(rawPriceRule)) {
            if (!(key in priceRule) && value !== null) {
                priceRule[key] = value;
            }
        }

        return {
            price_rule: priceRule
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
