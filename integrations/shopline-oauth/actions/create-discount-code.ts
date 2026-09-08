import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        price_rule_id: z.string().describe('The ID of the price rule under which the discount code is created. Example: "7684412083388548472"'),
        code: z.string().describe('The redeemable discount code string. Example: "SUMMER2025"')
    })
    .describe('Input for creating a discount code under a price rule.');

const ProviderDiscountCodeSchema = z.object({
    id: z.string(),
    code: z.string(),
    price_rule_id: z.string(),
    usage_count: z.number(),
    create_at: z.string().optional(),
    update_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique ID of the discount code.'),
        code: z.string().describe('The redeemable discount code string.'),
        price_rule_id: z.string().describe('The ID of the parent price rule.'),
        usage_count: z.number().describe('The number of times the code has been used.'),
        create_at: z.string().optional().describe('The timestamp when the discount code was created.'),
        update_at: z.string().optional().describe('The timestamp when the discount code was last updated.')
    })
    .describe('Output of a created discount code under a price rule.');

/**
 * @tags: [write]
 * @tagReason: Creates a new redeemable discount code under the specified price rule on the provider.
 * @pitfalls: The provider rejects duplicate code strings, and deleting the parent price rule permanently deletes every discount code attached to it.
 */
const action = createAction({
    description: 'Create a redeemable discount code under a price rule',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pathPriceRuleId = encodeURIComponent(input.price_rule_id);

        // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/discount-code/create-discount-code
        const response = await nango.post({
            endpoint: `/admin/openapi/v20260601/sales/price_rules/${pathPriceRuleId}/discount_codes.json`,
            data: {
                discount_code: {
                    code: input.code,
                    price_rule_id: input.price_rule_id
                }
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('discount_code' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not contain the expected discount_code object.'
            });
        }

        const discountCode = ProviderDiscountCodeSchema.parse(raw.discount_code);

        return {
            id: discountCode.id,
            code: discountCode.code,
            price_rule_id: discountCode.price_rule_id,
            usage_count: discountCode.usage_count,
            ...(discountCode.create_at !== undefined && { create_at: discountCode.create_at }),
            ...(discountCode.update_at !== undefined && { update_at: discountCode.update_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
