import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        code: z.string().describe('The discount code string to look up. Example: "SUMMER2024"')
    })
    .describe('Input for looking up a discount code by its code string.');

const DiscountCodeSchema = z
    .object({
        id: z.string().describe('The unique identifier of the discount code.'),
        price_rule_id: z.string().describe('The identifier of the parent price rule that owns this discount code.'),
        code: z.string().describe('The discount code string that customers enter at checkout.'),
        usage_count: z.number().describe('The number of times this discount code has been used.'),
        create_at: z.string().describe('The ISO 8601 timestamp when the discount code was created.'),
        update_at: z.string().describe('The ISO 8601 timestamp when the discount code was last updated.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        discount_code: DiscountCodeSchema.describe('The discount code matching the provided code string, if found.')
    })
    .describe('Output containing the discount code that matches the lookup query.');

/**
 * @tags: [read]
 * @tagReason: Looks up a discount code by its code string via a GET request to the provider API.
 */
const action = createAction({
    description: 'Look up a discount code by the code string itself (not its ID or price rule).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/discount-code/get-discount-code-by-code
            endpoint: '/admin/openapi/v20260601/sales/discount_codes/lookup.json',
            params: {
                code: input.code
            },
            retries: 3
        });

        const lookupResponse = z
            .object({
                discount_code: DiscountCodeSchema.nullable().optional()
            })
            .parse(response.data);

        if (!lookupResponse.discount_code) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `No discount code found for code: ${input.code}`
            });
        }

        return {
            discount_code: lookupResponse.discount_code
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
