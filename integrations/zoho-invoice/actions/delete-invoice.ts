import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        invoice_id: z.string().describe('The ID of the invoice to delete. Example: "260815000000101011"'),
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID that owns the invoice. Required because this connection cannot list organizations without the settings.READ scope.'
            )
    })
    .describe('Identifies the invoice to delete and the Zoho Invoice organization that owns it.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Zoho response code; 0 indicates the invoice was deleted successfully.'),
        message: z.string().describe('Human-readable result message from Zoho.')
    })
    .describe('Result of the invoice deletion request.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an invoice in the provider, a permanent and difficult-to-reverse mutation.
 * @pitfalls: Deleting an invoice is permanent; Zoho rejects deletion of invoices that have payments or credit notes applied, so those must be cleared first.
 */
const action = createAction({
    description: 'Delete an invoice in Zoho Invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.invoices.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://www.zoho.com/invoice/api/v3/invoices/#delete-an-invoice
            endpoint: `/invoice/v3/invoices/${encodeURIComponent(input.invoice_id)}`,
            params: {
                organization_id: input.organization_id
            },
            // Single retry only: deletes are resource-idempotent (a repeat returns "Resource does not exist"), so this covers transient failures without repeatedly re-issuing a destructive call.
            retries: 1
        });

        const body = ProviderResponseSchema.parse(response.data);

        if (body.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: body.message,
                code: body.code
            });
        }

        return {
            code: body.code,
            message: body.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
