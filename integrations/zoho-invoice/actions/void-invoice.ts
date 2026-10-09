import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        invoice_id: z.string().describe('ID of the invoice to void. Example: "260815000000171015"'),
        organization_id: z.string().describe('Zoho organization ID that owns the invoice. Required by every Zoho Invoice endpoint.')
    })
    .describe('Identifies the invoice to void and the Zoho organization that owns it.');

const ProviderVoidResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Zoho response code; 0 indicates the invoice was voided successfully.'),
        message: z.string().describe('Human-readable confirmation message returned by Zoho.')
    })
    .describe('Result of the void operation reported by Zoho.');

/**
 * @tags: [write, destructive]
 * @tagReason: Voids the invoice by changing its provider status, which is a mutation and an irreversible invalidation of the document.
 * @pitfalls: Voiding is irreversible and cannot be undone. Re-voiding an already-void invoice returns success, whereas an unknown invoice ID returns a provider error.
 */
const action = createAction({
    description: 'Void an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.invoices.CREATE'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/invoices/#void-an-invoice
        const response = await nango.post({
            endpoint: `/invoice/v3/invoices/${encodeURIComponent(input.invoice_id)}/status/void`,
            params: {
                organization_id: input.organization_id
            },
            // Voiding is naturally idempotent: re-voiding an already-void invoice returns success, so retrying after a lost response is safe.
            retries: 3
        });

        const providerResponse = ProviderVoidResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        return {
            code: providerResponse.code,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
