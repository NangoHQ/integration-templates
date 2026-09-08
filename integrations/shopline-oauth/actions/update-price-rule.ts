import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        price_rule_id: z.string().describe('The unique identifier of the price rule to update.'),
        title: z.string().describe('The display name of the price rule.'),
        value: z.string().describe('The discount value. Must be positive; for percentage discounts, use 0–100 (e.g., "10.0" for 10% off).'),
        value_type: z.enum(['percentage', 'fixed_amount']).describe('Whether the value represents a percentage or a fixed monetary amount.'),
        starts_at: z.string().describe('The date and time when the price rule becomes active, in ISO 8601 format.'),
        ends_at: z.string().optional().describe('The date and time when the price rule expires, in ISO 8601 format. Omit for an open-ended rule.'),
        target_type: z.string().optional().describe('The scope of the discount (e.g., line_item, shipping_line).'),
        target_selection: z.string().optional().describe('The selection strategy for the target (e.g., all, entitled).'),
        usage_limit: z.number().optional().describe('Maximum number of times the price rule can be used across all customers.'),
        usage_per_customer: z.number().optional().describe('Maximum number of times a single customer can use the price rule.'),
        entitled_product_ids: z.array(z.string()).optional().describe('Product IDs that qualify for the discount when target_selection is entitled.'),
        entitled_collection_ids: z.array(z.string()).optional().describe('Collection IDs that qualify for the discount when target_selection is entitled.'),
        entitled_country_ids: z.array(z.string()).optional().describe('Country IDs that qualify for the discount when target_selection is entitled.'),
        joint_discount: z.boolean().optional().describe('Whether the price rule can be combined with other discounts.'),
        overlay_discount_code: z.boolean().optional().describe('Whether a discount code can be overlaid on top of this price rule.'),
        allocation_method: z.string().optional().describe('How the discount is allocated across line items (e.g., each, across).'),
        note: z.string().optional().describe('An internal note about the price rule.')
    })
    .describe('Input for updating a price rule.');

const ProviderPriceRuleSchema = z.object({
    id: z.string(),
    title: z.string(),
    value: z.string(),
    value_type: z.string(),
    starts_at: z.string(),
    ends_at: z.string().nullable().optional(),
    target_type: z.string().nullable().optional(),
    target_selection: z.string().nullable().optional(),
    usage_limit: z.number().nullable().optional(),
    usage_per_customer: z.number().nullable().optional(),
    entitled_product_ids: z.array(z.string()).nullable().optional(),
    entitled_collection_ids: z.array(z.string()).nullable().optional(),
    entitled_country_ids: z.array(z.string()).nullable().optional(),
    joint_discount: z.boolean().nullable().optional(),
    overlay_discount_code: z.boolean().nullable().optional(),
    allocation_method: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the updated price rule.'),
        title: z.string().describe('The display name of the price rule.'),
        value: z.string().describe('The discount value.'),
        value_type: z.string().describe('Whether the value is a percentage or a fixed amount.'),
        starts_at: z.string().describe('The date and time when the price rule becomes active.'),
        ends_at: z.string().optional().describe('The date and time when the price rule expires, if set.'),
        target_type: z.string().optional().describe('The scope of the discount.'),
        target_selection: z.string().optional().describe('The selection strategy for the target.'),
        usage_limit: z.number().optional().describe('Maximum number of times the price rule can be used across all customers.'),
        usage_per_customer: z.number().optional().describe('Maximum number of times a single customer can use the price rule.'),
        entitled_product_ids: z.array(z.string()).optional().describe('Product IDs that qualify for the discount.'),
        entitled_collection_ids: z.array(z.string()).optional().describe('Collection IDs that qualify for the discount.'),
        entitled_country_ids: z.array(z.string()).optional().describe('Country IDs that qualify for the discount.'),
        joint_discount: z.boolean().optional().describe('Whether the price rule can be combined with other discounts.'),
        overlay_discount_code: z.boolean().optional().describe('Whether a discount code can be overlaid on top of this price rule.'),
        allocation_method: z.string().optional().describe('How the discount is allocated across line items.'),
        note: z.string().optional().describe('An internal note about the price rule.'),
        created_at: z.string().optional().describe('The date and time when the price rule was created.'),
        updated_at: z.string().optional().describe('The date and time when the price rule was last updated.')
    })
    .describe('Output of an updated price rule.');

/**
 * @tags: [write]
 * @tagReason: Sends a PUT request to the provider to mutate an existing price rule.
 * @pitfalls: When value_type is percentage, use a positive 0–100 value (e.g., "10.0" for 10% off); negative values are rejected by the provider.
 */
const action = createAction({
    description: "Update a price rule's fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_price_rules'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const priceRulePayload: {
            title: string;
            value: string;
            value_type: string;
            starts_at: string;
            ends_at?: string;
            target_type?: string;
            target_selection?: string;
            usage_limit?: number;
            usage_per_customer?: number;
            entitled_product_ids?: string[];
            entitled_collection_ids?: string[];
            entitled_country_ids?: string[];
            joint_discount?: boolean;
            overlay_discount_code?: boolean;
            allocation_method?: string;
            note?: string;
        } = {
            title: input.title,
            value: input.value,
            value_type: input.value_type,
            starts_at: input.starts_at
        };

        if (input.ends_at !== undefined) {
            priceRulePayload.ends_at = input.ends_at;
        }
        if (input.target_type !== undefined) {
            priceRulePayload.target_type = input.target_type;
        }
        if (input.target_selection !== undefined) {
            priceRulePayload.target_selection = input.target_selection;
        }
        if (input.usage_limit !== undefined) {
            priceRulePayload.usage_limit = input.usage_limit;
        }
        if (input.usage_per_customer !== undefined) {
            priceRulePayload.usage_per_customer = input.usage_per_customer;
        }
        if (input.entitled_product_ids !== undefined) {
            priceRulePayload.entitled_product_ids = input.entitled_product_ids;
        }
        if (input.entitled_collection_ids !== undefined) {
            priceRulePayload.entitled_collection_ids = input.entitled_collection_ids;
        }
        if (input.entitled_country_ids !== undefined) {
            priceRulePayload.entitled_country_ids = input.entitled_country_ids;
        }
        if (input.joint_discount !== undefined) {
            priceRulePayload.joint_discount = input.joint_discount;
        }
        if (input.overlay_discount_code !== undefined) {
            priceRulePayload.overlay_discount_code = input.overlay_discount_code;
        }
        if (input.allocation_method !== undefined) {
            priceRulePayload.allocation_method = input.allocation_method;
        }
        if (input.note !== undefined) {
            priceRulePayload.note = input.note;
        }

        const response = await nango.put({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/price-rule/update-price-rule
            endpoint: `/admin/openapi/v20260601/sales/price_rules/${encodeURIComponent(input.price_rule_id)}.json`,
            data: {
                price_rule: priceRulePayload
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                price_rule: ProviderPriceRuleSchema
            })
            .parse(response.data);

        const priceRule = providerResponse.price_rule;

        return {
            id: priceRule.id,
            title: priceRule.title,
            value: priceRule.value,
            value_type: priceRule.value_type,
            starts_at: priceRule.starts_at,
            ...(priceRule.ends_at != null && { ends_at: priceRule.ends_at }),
            ...(priceRule.target_type != null && { target_type: priceRule.target_type }),
            ...(priceRule.target_selection != null && { target_selection: priceRule.target_selection }),
            ...(priceRule.usage_limit != null && { usage_limit: priceRule.usage_limit }),
            ...(priceRule.usage_per_customer != null && { usage_per_customer: priceRule.usage_per_customer }),
            ...(priceRule.entitled_product_ids != null && { entitled_product_ids: priceRule.entitled_product_ids }),
            ...(priceRule.entitled_collection_ids != null && { entitled_collection_ids: priceRule.entitled_collection_ids }),
            ...(priceRule.entitled_country_ids != null && { entitled_country_ids: priceRule.entitled_country_ids }),
            ...(priceRule.joint_discount != null && { joint_discount: priceRule.joint_discount }),
            ...(priceRule.overlay_discount_code != null && { overlay_discount_code: priceRule.overlay_discount_code }),
            ...(priceRule.allocation_method != null && { allocation_method: priceRule.allocation_method }),
            ...(priceRule.note != null && { note: priceRule.note }),
            ...(priceRule.created_at != null && { created_at: priceRule.created_at }),
            ...(priceRule.updated_at != null && { updated_at: priceRule.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
