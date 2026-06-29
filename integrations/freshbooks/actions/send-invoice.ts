import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.number().describe('The ID of the invoice to send. Example: 453877'),
    method: z
        .enum(['email', 'mark_as_sent'])
        .describe('How to send the invoice. Use "email" to email the client, or "mark_as_sent" to mark as sent without emailing.')
});

const ProviderInvoiceSchema = z
    .object({
        id: z.number(),
        display_status: z.string().optional()
    })
    .passthrough();

const OutputSchema = ProviderInvoiceSchema;

const MetadataSchema = z.object({
    accountId: z.string()
});

const FreshBooksResponseSchema = z.object({
    response: z.object({
        result: z.object({
            invoice: z.unknown()
        })
    })
});

const action = createAction({
    description: 'Send an invoice by email or mark it as sent.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountId = metadata?.accountId;

        if (!accountId || typeof accountId !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata. Run get-account-id first.'
            });
        }

        const body: { invoice: { action_email?: boolean; action_mark_as_sent?: boolean } } = {
            invoice: {}
        };

        if (input.method === 'email') {
            body.invoice = { action_email: true };
        } else {
            body.invoice = { action_mark_as_sent: true };
        }

        const response = await nango.put({
            // https://www.freshbooks.com/api/invoices
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/invoices/invoices/${encodeURIComponent(String(input.invoice_id))}`,
            data: body,
            retries: 1
        });

        const parsedResponse = FreshBooksResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response format from FreshBooks API.',
                response: response.data
            });
        }

        const invoiceData = parsedResponse.data.response.result.invoice;
        if (invoiceData === null || typeof invoiceData !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Missing invoice object in FreshBooks API response.'
            });
        }

        return ProviderInvoiceSchema.parse(invoiceData);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
