import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .optional()
            .describe('Zoho Invoice organization ID. Optional; when omitted the action falls back to the `organization_id` connection metadata.'),
        customer_id: z.string().describe('Zoho Invoice contact (customer) ID whose full billing status to retrieve. Example: "260815000000097001".')
    })
    .describe("Input for retrieving a customer's consolidated Zoho Invoice billing status.");

const RawContactSchema = z
    .object({
        contact_id: z.string(),
        contact_name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        currency_code: z.string().nullable().optional(),
        outstanding_receivable_amount: z.number().nullable().optional(),
        unused_credits_receivable_amount: z.number().nullable().optional()
    })
    .passthrough();

const ContactResponseSchema = z
    .object({
        contact: RawContactSchema
    })
    .passthrough();

const RawInvoiceSchema = z
    .object({
        invoice_id: z.string(),
        invoice_number: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        due_date: z.string().nullable().optional(),
        total: z.number().nullable().optional(),
        balance: z.number().nullable().optional(),
        currency_code: z.string().nullable().optional()
    })
    .passthrough();

const RawPaymentSchema = z
    .object({
        payment_id: z.string(),
        payment_number: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        amount: z.number().nullable().optional(),
        unused_amount: z.number().nullable().optional(),
        payment_mode: z.string().nullable().optional(),
        invoice_numbers: z.string().nullable().optional()
    })
    .passthrough();

const RawCreditNoteSchema = z
    .object({
        creditnote_id: z.string(),
        creditnote_number: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        total: z.number().nullable().optional(),
        balance: z.number().nullable().optional(),
        currency_code: z.string().nullable().optional()
    })
    .passthrough();

const PageContextSchema = z
    .object({
        has_more_page: z.boolean().nullable().optional()
    })
    .passthrough();

const PageEnvelopeSchema = z
    .object({
        page_context: PageContextSchema.nullable().optional()
    })
    .passthrough();

const HttpErrorSchema = z
    .object({
        response: z
            .object({
                status: z.number()
            })
            .optional()
    })
    .passthrough();

const CustomerSummarySchema = z.object({
    customer_id: z.string().describe('Zoho Invoice contact (customer) ID.'),
    customer_name: z.string().optional().describe('Display name of the customer.'),
    email: z.string().optional().describe('Primary email address on the contact record, when present.'),
    currency_code: z.string().optional().describe('Currency code of the contact. Example: "USD".'),
    outstanding_receivable_amount: z
        .number()
        .optional()
        .describe("Zoho's own total outstanding receivable for the customer, used to cross-check the computed total."),
    unused_credits_receivable_amount: z.number().optional().describe("Zoho's own total unused credit for the customer, used to cross-check the computed total.")
});

const InvoiceSummarySchema = z.object({
    invoice_id: z.string().describe('Invoice ID.'),
    invoice_number: z.string().optional().describe('Human-readable invoice number.'),
    status: z.string().optional().describe('Invoice status. Example: "draft", "sent", "overdue", "partially_paid", "paid", "void".'),
    date: z.string().optional().describe('Invoice date in YYYY-MM-DD format.'),
    due_date: z.string().optional().describe('Payment due date in YYYY-MM-DD format.'),
    total: z.number().optional().describe('Total amount of the invoice.'),
    balance: z.number().optional().describe('Amount still outstanding on the invoice.'),
    currency_code: z.string().optional().describe('Currency code of the invoice. Example: "USD".')
});

const PaymentSummarySchema = z.object({
    payment_id: z.string().describe('Customer payment ID.'),
    payment_number: z.string().optional().describe('Sequential payment number.'),
    date: z.string().optional().describe('Payment date in YYYY-MM-DD format.'),
    amount: z.number().optional().describe('Total amount of the payment.'),
    unused_amount: z.number().optional().describe('Portion of the payment not yet applied to any invoice.'),
    payment_mode: z.string().optional().describe('Payment method. Example: "cash", "check".'),
    invoice_numbers: z.string().optional().describe('Comma-separated invoice numbers the payment is applied to.')
});

const CreditNoteSummarySchema = z.object({
    creditnote_id: z.string().describe('Credit note ID.'),
    creditnote_number: z.string().optional().describe('Human-readable credit note number.'),
    status: z.string().optional().describe('Credit note status. Example: "open", "closed", "void".'),
    date: z.string().optional().describe('Credit note date in YYYY-MM-DD format.'),
    total: z.number().optional().describe('Total amount of the credit note.'),
    balance: z.number().optional().describe('Unapplied credit remaining on the credit note.'),
    currency_code: z.string().optional().describe('Currency code of the credit note. Example: "USD".')
});

const OutputSchema = z
    .object({
        customer: CustomerSummarySchema.describe("The customer's contact record with Zoho's own built-in billing totals."),
        invoices: z.array(InvoiceSummarySchema).describe("All invoices for the customer, including each invoice's outstanding balance."),
        payments: z.array(PaymentSummarySchema).describe('All payments received from the customer.'),
        credit_notes: z.array(CreditNoteSummarySchema).describe('All credit notes issued to the customer, including any remaining balance.'),
        total_outstanding: z.number().describe('Sum of the balances of all invoices returned for this customer.'),
        total_unused_credit: z.number().describe('Sum of the balances of all credit notes returned for this customer.'),
        contact_outstanding_receivable_amount: z
            .number()
            .optional()
            .describe("Zoho's own outstanding receivable amount from the contact record, for cross-checking total_outstanding."),
        contact_unused_credits_receivable_amount: z
            .number()
            .optional()
            .describe("Zoho's own unused credits amount from the contact record, for cross-checking total_unused_credit."),
        outstanding_matches_contact: z.boolean().describe("Whether total_outstanding equals the contact record's own outstanding receivable amount."),
        unused_credit_matches_contact: z.boolean().describe("Whether total_unused_credit equals the contact record's own unused credits amount.")
    })
    .describe('Consolidated billing status for a Zoho Invoice customer, including invoices, payments, credit notes, and computed totals.');

const isHttpStatusError = (error: unknown, status: number): boolean => {
    const parsed = HttpErrorSchema.safeParse(error);
    return parsed.success && parsed.data.response?.status === status;
};

const amountsMatch = (computed: number, contactAmount: number | undefined): boolean => {
    if (contactAmount === undefined) {
        return false;
    }
    return Math.abs(computed - contactAmount) < 0.005;
};

/**
 * @tags: [read]
 * @tagReason: Reads the customer's invoices, payments, credit notes, and contact record; it never mutates provider data.
 * @pitfalls: This connection's scope cannot look up organizations, so organization_id must be supplied in the input or present in connection metadata or the action fails; total_outstanding sums every returned invoice balance including draft and void invoices, so it can differ from the contact's own outstanding_receivable_amount (the *_matches_contact flags report whether they agree).
 */
const action = createAction({
    description:
        "Get a consolidated view of a customer's full billing status: all invoices with balances, all payments received, all credit notes, and total outstanding/unused-credit amounts.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.contacts.ALL', 'ZohoInvoice.invoices.ALL', 'ZohoInvoice.customerpayments.ALL', 'ZohoInvoice.creditnotes.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = input.organization_id ?? (await nango.getMetadata<{ organization_id?: string }>())?.organization_id;

        if (!organizationId) {
            throw new nango.ActionError({
                type: 'missing_organization_id',
                message: 'organization_id is required. Pass it in the input or set the `organization_id` connection metadata.'
            });
        }

        const customerId = input.customer_id;

        const fetchAllPages = async (resourcePath: string, arrayKey: string): Promise<unknown[]> => {
            const records: unknown[] = [];
            let page = 1;
            let hasMorePage = true;

            while (hasMorePage) {
                // Zoho Invoice list endpoints return a resource array plus a page_context envelope and paginate with page/per_page:
                // https://www.zoho.com/invoice/api/v3/invoices/
                // https://www.zoho.com/invoice/api/v3/customerpayments/
                // https://www.zoho.com/invoice/api/v3/creditnotes/
                const response = await nango.get({
                    endpoint: `/invoice/v3/${resourcePath}`,
                    params: {
                        organization_id: organizationId,
                        customer_id: customerId,
                        page,
                        per_page: 200
                    },
                    retries: 3
                });

                const envelope = PageEnvelopeSchema.parse(response.data);
                const pageRecords = envelope[arrayKey];
                if (Array.isArray(pageRecords)) {
                    records.push(...pageRecords);
                }
                hasMorePage = envelope.page_context?.has_more_page === true;
                page += 1;
            }

            return records;
        };

        const rawInvoices = await fetchAllPages('invoices', 'invoices');
        const rawPayments = await fetchAllPages('customerpayments', 'customerpayments');
        const rawCreditNotes = await fetchAllPages('creditnotes', 'creditnotes');

        let contact: z.infer<typeof RawContactSchema>;

        // @allowTryCatch: Zoho answers HTTP 404 for an unknown contact id; surface it as a clear ActionError instead of a raw HTTP failure.
        try {
            // Zoho Invoice contact detail: https://www.zoho.com/invoice/api/v3/contacts/#get-a-contact
            const response = await nango.get({
                endpoint: `/invoice/v3/contacts/${encodeURIComponent(customerId)}`,
                params: {
                    organization_id: organizationId
                },
                retries: 3
            });
            contact = ContactResponseSchema.parse(response.data).contact;
        } catch (error) {
            if (isHttpStatusError(error, 404)) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `No Zoho Invoice customer found with id ${customerId}.`
                });
            }
            throw error;
        }

        const invoices = z.array(RawInvoiceSchema).parse(rawInvoices);
        const payments = z.array(RawPaymentSchema).parse(rawPayments);
        const creditNotes = z.array(RawCreditNoteSchema).parse(rawCreditNotes);

        const totalOutstanding = invoices.reduce((sum, invoice) => sum + (invoice.balance ?? 0), 0);
        const totalUnusedCredit = creditNotes.reduce((sum, creditNote) => sum + (creditNote.balance ?? 0), 0);

        const contactOutstanding = contact.outstanding_receivable_amount ?? undefined;
        const contactUnusedCredit = contact.unused_credits_receivable_amount ?? undefined;

        return {
            customer: {
                customer_id: contact.contact_id,
                ...(contact.contact_name != null && { customer_name: contact.contact_name }),
                ...(contact.email != null && { email: contact.email }),
                ...(contact.currency_code != null && { currency_code: contact.currency_code }),
                ...(contactOutstanding !== undefined && { outstanding_receivable_amount: contactOutstanding }),
                ...(contactUnusedCredit !== undefined && { unused_credits_receivable_amount: contactUnusedCredit })
            },
            invoices: invoices.map((invoice) => ({
                invoice_id: invoice.invoice_id,
                ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
                ...(invoice.status != null && { status: invoice.status }),
                ...(invoice.date != null && { date: invoice.date }),
                ...(invoice.due_date != null && { due_date: invoice.due_date }),
                ...(invoice.total != null && { total: invoice.total }),
                ...(invoice.balance != null && { balance: invoice.balance }),
                ...(invoice.currency_code != null && { currency_code: invoice.currency_code })
            })),
            payments: payments.map((payment) => ({
                payment_id: payment.payment_id,
                ...(payment.payment_number != null && { payment_number: payment.payment_number }),
                ...(payment.date != null && { date: payment.date }),
                ...(payment.amount != null && { amount: payment.amount }),
                ...(payment.unused_amount != null && { unused_amount: payment.unused_amount }),
                ...(payment.payment_mode != null && { payment_mode: payment.payment_mode }),
                ...(payment.invoice_numbers != null && { invoice_numbers: payment.invoice_numbers })
            })),
            credit_notes: creditNotes.map((creditNote) => ({
                creditnote_id: creditNote.creditnote_id,
                ...(creditNote.creditnote_number != null && { creditnote_number: creditNote.creditnote_number }),
                ...(creditNote.status != null && { status: creditNote.status }),
                ...(creditNote.date != null && { date: creditNote.date }),
                ...(creditNote.total != null && { total: creditNote.total }),
                ...(creditNote.balance != null && { balance: creditNote.balance }),
                ...(creditNote.currency_code != null && { currency_code: creditNote.currency_code })
            })),
            total_outstanding: totalOutstanding,
            total_unused_credit: totalUnusedCredit,
            ...(contactOutstanding !== undefined && { contact_outstanding_receivable_amount: contactOutstanding }),
            ...(contactUnusedCredit !== undefined && { contact_unused_credits_receivable_amount: contactUnusedCredit }),
            outstanding_matches_contact: amountsMatch(totalOutstanding, contactOutstanding),
            unused_credit_matches_contact: amountsMatch(totalUnusedCredit, contactUnusedCredit)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
