import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        payment_id: z.string().describe('ID of the customer payment to delete. Example: "260815000000159260"'),
        organization_id: z.string().describe('ID of the Zoho Inventory organization the payment belongs to. Example: "927270289"')
    })
    .describe('Input for deleting a recorded customer payment.');

const ProviderDeleteResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Provider status code; 0 indicates the payment was deleted successfully.'),
        message: z.string().describe('Provider confirmation message. Example: "The payment has been deleted."')
    })
    .describe('Result of deleting the customer payment.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a recorded customer payment and reverses its application to any invoices it was applied to.
 * @pitfalls: Deleting a payment is irreversible and also reverts the status and outstanding balance of every invoice the payment was applied to.
 */
const action = createAction({
    description: 'Delete a recorded customer payment, reversing its application to any invoices it was applied to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.customerpayments.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.zoho.com/inventory/api/v1/customer-payments/#delete-a-payment
            endpoint: `/inventory/v1/customerpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const parsed = ProviderDeleteResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: parsed.message,
                code: parsed.code
            });
        }

        return {
            code: parsed.code,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
