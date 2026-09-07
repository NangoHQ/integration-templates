import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        price_rule_id: z.string().describe('The ID of the price rule that owns the discount code. Example: "7684454888240582151"'),
        discount_code_id: z.string().describe('The ID of the discount code to update. Example: "7684454892602655773"'),
        code: z.string().describe('The new discount code string. Example: "NANGOTEST10-UPDATED"')
    })
    .describe('Input for updating a discount code.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier for the discount code. Example: "7684454892602655773"'),
        code: z.string().describe('The discount code content. Example: "NANGOTEST10-UPDATED"'),
        price_rule_id: z.string().describe('The ID of the parent price rule. Example: "7684454888240582151"'),
        create_at: z.string().optional().describe('The ISO 8601 timestamp when the discount code was created.'),
        update_at: z.string().optional().describe('The ISO 8601 timestamp when the discount code was last updated.'),
        usage_count: z.number().optional().describe('The number of times the discount code has been used.')
    })
    .describe('Output of an updated discount code.');

/**
 * @tags: [write]
 * @tagReason: Updates the discount code string via a PUT request to the provider.
 * @pitfalls: The API enforces store-wide unique discount code strings; updating to a code that already exists returns 400 "discount code is repeat".
 */
const action = createAction({
    description: 'Update a discount code.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/marketing/discount-code/update-discount-code
        const response = await nango.put({
            endpoint: `/admin/openapi/v20260601/sales/price_rules/${encodeURIComponent(input.price_rule_id)}/discount_codes/${encodeURIComponent(input.discount_code_id)}.json`,
            data: {
                discount_code: {
                    code: input.code,
                    price_rule_id: input.price_rule_id
                }
            },
            retries: 3
        });

        const providerSchema = z.object({
            discount_code: z.object({
                id: z.string(),
                code: z.string(),
                price_rule_id: z.string(),
                create_at: z.string().optional(),
                update_at: z.string().optional(),
                usage_count: z.number().optional()
            })
        });

        const providerData = providerSchema.parse(response.data);

        return {
            id: providerData.discount_code.id,
            code: providerData.discount_code.code,
            price_rule_id: providerData.discount_code.price_rule_id,
            create_at: providerData.discount_code.create_at,
            update_at: providerData.discount_code.update_at,
            usage_count: providerData.discount_code.usage_count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
