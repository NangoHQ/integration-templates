import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the customer to delete.')
    })
    .describe('Input parameters for deleting a customer.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a customer permanently from the provider. This operation is irreversible.
 * @pitfalls: Customer deletion is permanent and irreversible; attempting to delete a non-existent customer throws a 404 error.
 */
const action = createAction({
    description: 'Delete a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No content. The customer was deleted successfully.'),
    scopes: ['customers:write'],

    exec: async (nango, input): Promise<null> => {
        // https://developers.gorgias.com/reference/delete-customer
        await nango.delete({
            endpoint: `/api/customers/${encodeURIComponent(input.id)}`,
            retries: 3
        });
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
