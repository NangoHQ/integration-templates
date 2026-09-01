import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        customer_id: z.number().describe('The ID of the customer whose data field should be updated.'),
        data: z.object({}).passthrough().describe('Arbitrary structured JSON data to set on the customer.')
    })
    .describe('Input for setting arbitrary structured JSON data on a customer data field.');

/**
 * @tags: [write, destructive]
 * @tagReason: Replaces the entire customer data field with the provided object, clearing any previously stored values.
 */
const action = createAction({
    description: 'Set arbitrary structured JSON data on a customer data field.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response body.'),
    scopes: ['customers:write'],

    exec: async (nango, input): Promise<null> => {
        // https://developers.gorgias.com/reference/put-api-customers-customer-id-data
        await nango.put({
            endpoint: `/api/customers/${encodeURIComponent(String(input.customer_id))}/data`,
            data: {
                data: input.data
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
