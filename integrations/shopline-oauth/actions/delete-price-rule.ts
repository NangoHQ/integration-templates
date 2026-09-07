import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        price_rule_id: z.string().describe('The unique identifier of the price rule to delete. Example: "7691681956896445150"')
    })
    .describe('Input for deleting a price rule.');

const OutputSchema = z.object({}).describe('Empty response confirming the price rule was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes the price rule permanently from the provider.
 * @pitfalls: Deleting a price rule is irreversible and cascades to permanently delete all associated discount codes.
 */
const action = createAction({
    description: 'Delete a price rule.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/sales/price-rule/delete-price-rule
            endpoint: `/admin/openapi/v20260601/sales/price_rules/${encodeURIComponent(input.price_rule_id)}.json`,
            retries: 3
        });

        const emptyResponse = z.object({}).parse(response.data);

        return emptyResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
