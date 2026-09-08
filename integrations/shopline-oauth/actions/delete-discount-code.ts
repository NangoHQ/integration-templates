import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        price_rule_id: z.string().describe('The ID of the price rule that owns the discount code.'),
        discount_code_id: z.string().describe('The ID of the discount code to delete.')
    })
    .describe('Input for deleting a discount code.');

const OutputSchema = z.object({}).describe('Empty output confirming the discount code was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a discount code from the provider.
 */
const action = createAction({
    description: 'Delete a discount code.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/discount-codes/delete-discount-code
        await nango.delete({
            endpoint: `/admin/openapi/v20260601/sales/price_rules/${encodeURIComponent(input.price_rule_id)}/discount_codes/${encodeURIComponent(input.discount_code_id)}.json`,
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
