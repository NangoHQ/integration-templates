import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        creditnote_id: z.string().describe('Credit note ID. Example: "260815000000155082"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the Zoho Inventory credit note to retrieve.');

const CreditedInvoiceSchema = z.object({
    invoice_id: z.string().nullable().optional().describe('ID of the invoice the credit was applied to.'),
    creditnote_invoice_id: z.string().nullable().optional().describe('ID of the applied-credit record linking this credit note to the invoice.'),
    invoice_number: z.string().nullable().optional().describe('Human-readable invoice number. Example: "INV-000019".'),
    date: z.string().nullable().optional().describe('Date the credit was applied to the invoice (yyyy-MM-dd).'),
    credited_amount: z.number().nullable().optional().describe('Amount of this credit note applied to the invoice.')
});

const CreditNoteSchema = z
    .object({
        creditnote_id: z.string().describe('Unique credit note ID.'),
        creditnote_number: z.string().nullable().optional().describe('Human-readable credit note number. Example: "CN-00007".'),
        status: z.string().nullable().optional().describe('Credit note status: draft, open, closed, or void.'),
        date: z.string().nullable().optional().describe('Credit note date (yyyy-MM-dd).'),
        issued_date: z.string().nullable().optional().describe('Date the credit note was issued (yyyy-MM-dd), or empty when not issued.'),
        reference_number: z.string().nullable().optional().describe('Optional external reference number.'),
        customer_id: z.string().nullable().optional().describe('ID of the customer the credit note is issued to.'),
        customer_name: z.string().nullable().optional().describe('Name of the customer the credit note is issued to.'),
        currency_code: z.string().nullable().optional().describe('Three-letter currency code. Example: "USD".'),
        exchange_rate: z.number().nullable().optional().describe('Exchange rate used for the credit note currency.'),
        sub_total: z.number().nullable().optional().describe('Sum of line item amounts before tax.'),
        tax_total: z.number().nullable().optional().describe('Total tax applied to the credit note.'),
        total: z.number().nullable().optional().describe('Total credit note amount.'),
        total_credits_used: z.number().nullable().optional().describe('Amount of this credit note already applied to invoices.'),
        total_refunded_amount: z.number().nullable().optional().describe('Amount of this credit note already refunded to the customer.'),
        balance: z.number().nullable().optional().describe('Remaining unused credit balance.'),
        notes: z.string().nullable().optional().describe('Notes shown on the credit note.'),
        created_time: z.string().nullable().optional().describe('Creation timestamp with a numeric offset. Example: "2026-10-09T13:23:54-0400".'),
        last_modified_time: z.string().nullable().optional().describe('Last modification timestamp with a numeric offset.'),
        invoices_credited: z
            .array(CreditedInvoiceSchema)
            .nullable()
            .optional()
            .describe('Invoices this credit note has been applied to, with the credited amount for each.')
    })
    .passthrough()
    .describe('A Zoho Inventory credit note, including its line items and the invoices it has been applied to.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    creditnote: CreditNoteSchema.optional()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing credit note and its applied invoices from Zoho Inventory without modifying provider state.
 * @pitfalls: Requesting a credit note ID that does not exist (including one that was deleted) fails with the provider's not-found error instead of returning an empty or null result.
 */
const action = createAction({
    description: 'Get full details for one Zoho Inventory credit note by ID, including the invoices it has been applied to.',
    version: '1.0.0',
    input: InputSchema,
    output: CreditNoteSchema,
    scopes: ['ZohoInventory.creditnotes.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof CreditNoteSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/credit-notes/#get-a-credit-note
        const response = await nango.get({
            endpoint: `/inventory/v1/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message ?? 'Failed to retrieve credit note.',
                code: providerResponse.code
            });
        }

        if (!providerResponse.creditnote) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Inventory did not return the credit note.',
                creditnote_id: input.creditnote_id
            });
        }

        return providerResponse.creditnote;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
