import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.string().describe('The unique identifier of the customer whose address will be deleted.'),
        address_id: z.string().describe('The unique identifier of the customer address to delete.')
    })
    .describe('Input for deleting a customer address.');

const OutputSchema = z.object({}).describe('Empty success response indicating the address was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a customer address from the provider.
 */
const action = createAction({
    description: 'Delete a customer address.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/customer/address/delete-customer-address
        const response = await nango.delete({
            endpoint: `/admin/openapi/v20260601/customers/${encodeURIComponent(input.customer_id)}/addresses/${encodeURIComponent(input.address_id)}.json`,
            retries: 10
        });

        const providerResponse = z.object({}).parse(response.data);

        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
