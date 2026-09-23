import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.string().describe('The unique identifier of the customer whose address will be set as default.'),
        address_id: z.string().describe('The unique identifier of the address to mark as default.')
    })
    .describe('Input for setting a customer address as the default.');

const OutputSchema = z
    .object({
        success: z.literal(true).describe('Indicates that the default address was successfully set.')
    })
    .describe('Output confirming a customer address was set as the default.');

/**
 * @tags: [write]
 * @tagReason: Mutates the customer record by changing which address is marked as default.
 */
const action = createAction({
    description: "Mark an address as a customer's default.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/address/set-default-address
            endpoint: `/admin/openapi/v20260601/customers/${encodeURIComponent(input.customer_id)}/addresses/${encodeURIComponent(input.address_id)}/default.json`,
            retries: 3
        });

        z.object({}).parse(response.data);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
