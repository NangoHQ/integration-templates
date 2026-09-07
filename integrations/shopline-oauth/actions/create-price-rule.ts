import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        title: z.string().describe('The title of the price rule. Example: "Summer Sale 10% Off"'),
        value_type: z.enum(['percentage', 'fixed_amount']).describe('The type of discount value. Either "percentage" or "fixed_amount".'),
        value: z.string().describe('The discount value as a string. For percentage, must be a positive number between 0 and 100 (e.g. "10.0" for 10% off).'),
        starts_at: z.string().describe('The start date and time of the price rule in ISO 8601 format. Example: "2026-09-01T00:00:00Z"'),
        ends_at: z.string().optional().describe('The end date and time of the price rule in ISO 8601 format. Example: "2026-09-30T23:59:59Z"'),
        target_type: z.enum(['line_item', 'shipping_line']).optional().describe('The target type of the discount. Either "line_item" or "shipping_line".'),
        target_selection: z.enum(['all', 'entitled']).optional().describe('The target selection of the discount. Either "all" or "entitled".'),
        allocation_method: z.enum(['each', 'across']).optional().describe('The allocation method for the discount. Either "each" or "across".'),
        usage_limit: z.number().optional().describe('The maximum number of times the price rule can be used in total.'),
        usage_per_customer: z.number().optional().describe('The maximum number of times the price rule can be used by a single customer.'),
        note: z.string().optional().describe('An optional note for the price rule.')
    })
    .describe('Input for creating a discount price rule');

const PriceRuleSchema = z.object({
    id: z.string().describe('The unique identifier of the price rule.'),
    title: z.string().optional().describe('The title of the price rule.'),
    value_type: z.string().optional().describe('The type of discount value. Either "percentage" or "fixed_amount".'),
    value: z.string().optional().describe('The discount value as a string.'),
    starts_at: z.string().optional().describe('The start date and time of the price rule in ISO 8601 format.'),
    ends_at: z.string().optional().nullable().describe('The end date and time of the price rule in ISO 8601 format.'),
    target_type: z.string().optional().describe('The target type of the discount. Either "line_item" or "shipping_line".'),
    target_selection: z.string().optional().describe('The target selection of the discount. Either "all" or "entitled".'),
    allocation_method: z.string().optional().describe('The allocation method for the discount. Either "each" or "across".'),
    usage_limit: z.number().optional().nullable().describe('The maximum number of times the price rule can be used in total.'),
    usage_per_customer: z.number().optional().nullable().describe('The maximum number of times the price rule can be used by a single customer.'),
    note: z.string().optional().nullable().describe('An optional note for the price rule.'),
    created_at: z.string().optional().describe('The date and time when the price rule was created in ISO 8601 format.'),
    updated_at: z.string().optional().describe('The date and time when the price rule was last updated in ISO 8601 format.')
});

const OutputSchema = z
    .object({
        price_rule: PriceRuleSchema.describe('The created price rule object.')
    })
    .describe('Output from creating a discount price rule');

/**
 * @tags: [write]
 * @tagReason: Creates a new discount price rule on the provider.
 * @pitfalls: For percentage-type price rules, the value must be positive (0–100), not negative; a negative value returns a 500 error. The provider silently overrides `allocation_method` to `across` even when `each` is requested.
 */
const action = createAction({
    description: 'Create a discount price rule.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['sales'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/price_rules/price_rule-create
            endpoint: '/admin/openapi/v20260601/sales/price_rules.json',
            data: {
                price_rule: {
                    title: input.title,
                    value_type: input.value_type,
                    value: input.value,
                    starts_at: input.starts_at,
                    ...(input.ends_at !== undefined && { ends_at: input.ends_at }),
                    ...(input.target_type !== undefined && { target_type: input.target_type }),
                    ...(input.target_selection !== undefined && { target_selection: input.target_selection }),
                    ...(input.allocation_method !== undefined && { allocation_method: input.allocation_method }),
                    ...(input.usage_limit !== undefined && { usage_limit: input.usage_limit }),
                    ...(input.usage_per_customer !== undefined && { usage_per_customer: input.usage_per_customer }),
                    ...(input.note !== undefined && { note: input.note })
                }
            },
            retries: 10
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response shape.',
                details: parsed.error.message
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
