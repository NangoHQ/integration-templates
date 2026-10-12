import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID that owns the payment. Example: "927270289"'),
        payment_id: z.string().describe('ID of the customer payment to delete. Example: "260815000000165073"')
    })
    .describe('Input for deleting a Zoho Invoice customer payment.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the provider confirmed the payment was deleted.'),
        message: z.string().describe('Provider confirmation message. Example: "The payment has been deleted."')
    })
    .describe('Result of deleting a Zoho Invoice customer payment.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a customer payment through the provider, which permanently reverses the payment and restores any invoice balance and status it had changed.
 * @pitfalls: Deleting a payment is irreversible and reverts the affected invoices' balances and statuses (for example paid or partially_paid back to sent); deleting an unknown or already-deleted payment_id fails; organization_id must be provided because this connection's scope cannot list organizations.
 */
const action = createAction({
    description: 'Delete a customer payment, reversing any invoice balance it had reduced.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.customerpayments.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.zoho.com/invoice/api/v3/customerpayments/
            endpoint: `/invoice/v3/customerpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: input.organization_id
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- A replay after a lost response fails for the already-deleted payment and would report a completed deletion as a failure.
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: providerResponse.message
            });
        }

        return {
            success: true,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
