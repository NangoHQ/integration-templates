import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        price_rule_id: z.string().describe('Price rule ID. Example: "7684412083388548472"'),
        discount_code_id: z.string().describe('Discount code ID. Example: "7684412277165393286"')
    })
    .describe('Input to retrieve a single discount code by ID scoped to its price rule.');

const DiscountCodeSchema = z.object({
    id: z.string().describe('Discount code ID.'),
    price_rule_id: z.string().describe('Price rule ID this code belongs to.'),
    code: z.string().describe('The discount code string.'),
    usage_count: z.number().describe('Number of times the code has been used.').optional(),
    create_at: z.string().describe('Creation timestamp in ISO 8601 format.').optional(),
    update_at: z.string().describe('Last update timestamp in ISO 8601 format.').optional()
});

const OutputSchema = z
    .object({
        discount_code: DiscountCodeSchema.describe('The discount code object.')
    })
    .describe('Output containing the retrieved discount code scoped to its price rule.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single discount code by ID from the provider.
 */
const action = createAction({
    description: 'Retrieve a single discount code by its ID (scoped to its price rule).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/price-rules/discount-codes/get-discount-code
            endpoint: `/admin/openapi/v20260601/sales/price_rules/${encodeURIComponent(input.price_rule_id)}/discount_codes/${encodeURIComponent(input.discount_code_id)}.json`,
            retries: 3
        });

        const parsed = z.object({ discount_code: z.object({}).passthrough() }).parse(response.data);
        const discountCode = DiscountCodeSchema.parse(parsed.discount_code);

        return {
            discount_code: discountCode
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
