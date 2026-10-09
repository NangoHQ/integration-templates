import { z } from 'zod';
import { createAction } from 'nango';

const CreditNoteInvoiceAllocationSchema = z
    .object({
        invoice_id: z.string().describe('ID of the invoice to apply credit to. Example: "90300000079426"'),
        amount_applied: z
            .number()
            .describe('Amount of credit to apply to this invoice. Must not exceed the credit note remaining balance or the invoice balance due. Example: 41.82')
    })
    .describe('Allocation of credit to a single invoice.');

const InputSchema = z
    .object({
        creditnote_id: z.string().describe('Unique identifier of the credit note to apply. Example: "90300000072369"'),
        organization_id: z.string().describe('ID of the Zoho Inventory organization. Example: "10234695"'),
        invoices: z
            .array(CreditNoteInvoiceAllocationSchema)
            .min(1)
            .describe('Invoices to apply the credit note to, each with the amount of credit to allocate.')
    })
    .describe('Input for applying a credit note to one or more invoices.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        code: z.number().describe('Zoho response code; 0 indicates the credits were applied successfully.'),
        message: z.string().describe('Human-readable result message from Zoho. Example: "Credits have been applied to the invoice(s)."')
    })
    .describe('Result of applying a credit note to invoices.');

/**
 * @tags: [write, destructive]
 * @tagReason: Allocates credit to invoices via a provider POST that permanently mutates both the credit note and the invoices.
 * @pitfalls: Applying a credit note is irreversible: the applied credit note can no longer be deleted or voided, and the invoice it was applied to can no longer be deleted. Re-invoking with the same invoice applies additional credit rather than replacing the previous allocation.
 */
const action = createAction({
    description: 'Apply a credit note to one or more invoices.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.creditnotes.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/credit-notes/#apply-credits-to-invoices
            endpoint: `/inventory/v1/creditnotes/${encodeURIComponent(input.creditnote_id)}/invoices`,
            params: {
                organization_id: input.organization_id
            },
            data: {
                invoices: input.invoices
            },
            // Applying credit is not idempotent: a retry after a lost response would allocate the credit twice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            code: providerResponse.code,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
