import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.number().int().describe('The ID of the customer whose custom field value should be cleared. Example: 519543245'),
        custom_field_id: z.number().int().describe('The ID of the custom field definition whose value should be cleared. Example: 319618')
    })
    .describe('Input to clear a single custom field value on a customer.');

/**
 * @tags: [write, destructive]
 * @tagReason: Clears a single custom field value on a customer via a DELETE request.
 * @pitfalls: Returns a 400 error if the custom field value was never set on the customer, so callers should not assume idempotent deletion.
 */
const action = createAction({
    description: 'Clear a single custom field value on a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the custom field value was successfully cleared.'),

    exec: async (nango, input): Promise<null> => {
        // https://developers.gorgias.com/reference/delete-customer-custom-field-value
        await nango.delete({
            endpoint: `/api/customers/${encodeURIComponent(input.customer_id)}/custom-fields/${encodeURIComponent(input.custom_field_id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
