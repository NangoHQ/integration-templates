import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    credit_note_id: z.string().describe('Xero generated unique identifier for the credit note. Example: "717f2bfc-c6d4-41fd-b238-3f2f0c0cf777"'),
    type: z
        .enum(['ACCRECCREDIT', 'ACCPAYCREDIT'])
        .optional()
        .describe('Type of credit note. ACCRECCREDIT for Accounts Receivable (sales credit notes), ACCPAYCREDIT for Accounts Payable (purchase credit notes).'),
    contact_id: z.string().optional().describe('Contact ID associated with the credit note.'),
    date: z.string().optional().describe('Date of the credit note in YYYY-MM-DD format.'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED', 'DELETED']).optional().describe('Status of the credit note.'),
    line_items: z
        .array(
            z.object({
                description: z.string().optional(),
                quantity: z.number().optional(),
                unit_amount: z.number().optional(),
                account_code: z.string().optional(),
                tax_type: z.string().optional()
            })
        )
        .optional()
        .describe('Line items for the credit note.'),
    reference: z.string().optional().describe('Reference or description for the credit note.'),
    sent_to_contact: z
        .boolean()
        .optional()
        .describe(
            'Boolean indicating whether the credit note has been sent to the contact. Only writable when credit note is in Awaiting Payment or Paid state.'
        ),
    currency_rate: z.number().optional().describe('Currency rate for multicurrency transactions.')
});

const OutputSchema = z.object({
    credit_note_id: z.string(),
    credit_note_number: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    date: z.union([z.string(), z.null()]),
    contact_id: z.union([z.string(), z.null()]),
    reference: z.union([z.string(), z.null()]),
    total: z.union([z.number(), z.null()]),
    sub_total: z.union([z.number(), z.null()]),
    total_tax: z.union([z.number(), z.null()]),
    updated_date_utc: z.union([z.string(), z.null()]),
    remaining_credit: z.union([z.number(), z.null()])
});

const action = createAction({
    description: 'Update an existing credit note.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-credit-note'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.contacts', 'accounting.settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.xero.com/documentation/api/accounting/creditnotes
        // Resolve tenant ID using connection_config, metadata, or connections API
        const connection = await nango.getConnection();

        let tenantId: string | null = null;

        if (connection.connection_config && typeof connection.connection_config === 'object' && 'tenant_id' in connection.connection_config) {
            const configValue = connection.connection_config['tenant_id'];
            if (typeof configValue === 'string') {
                tenantId = configValue;
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object' && 'tenantId' in connection.metadata) {
            const metadataValue = connection.metadata['tenantId'];
            if (typeof metadataValue === 'string') {
                tenantId = metadataValue;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            if (connectionsResponse.data && Array.isArray(connectionsResponse.data)) {
                if (connectionsResponse.data.length === 1) {
                    const firstConnection = connectionsResponse.data[0];
                    if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection) {
                        const tenantIdValue = firstConnection['tenantId'];
                        if (typeof tenantIdValue === 'string') {
                            tenantId = tenantIdValue;
                        }
                    }
                } else if (connectionsResponse.data.length > 1) {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant_id',
                message: 'Could not resolve tenant ID from connection_config, metadata, or connections API.'
            });
        }

        // Build the CreditNotes payload
        const creditNotePayload: Record<string, unknown> = {
            CreditNoteID: input.credit_note_id
        };

        if (input.type) {
            creditNotePayload['Type'] = input.type;
        }
        if (input.contact_id) {
            creditNotePayload['Contact'] = { ContactID: input.contact_id };
        }
        if (input.date) {
            creditNotePayload['Date'] = input.date;
        }
        if (input.status) {
            creditNotePayload['Status'] = input.status;
        }
        if (input.reference) {
            creditNotePayload['Reference'] = input.reference;
        }
        if (input.sent_to_contact !== undefined) {
            creditNotePayload['SentToContact'] = input.sent_to_contact;
        }
        if (input.currency_rate !== undefined) {
            creditNotePayload['CurrencyRate'] = input.currency_rate;
        }
        if (input.line_items && input.line_items.length > 0) {
            creditNotePayload['LineItems'] = input.line_items.map((item) => ({
                Description: item.description,
                Quantity: item.quantity,
                UnitAmount: item.unit_amount,
                AccountCode: item.account_code,
                TaxType: item.tax_type
            }));
        }

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const response = await nango.post({
            endpoint: 'api.xro/2.0/CreditNotes',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                CreditNotes: [creditNotePayload]
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Empty response from Xero API'
            });
        }

        // Parse response data
        const responseData = response.data;
        if (typeof responseData !== 'object' || responseData === null) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response data from Xero API'
            });
        }

        const creditNotesArray = responseData['CreditNotes'];
        if (!Array.isArray(creditNotesArray) || creditNotesArray.length === 0) {
            throw new nango.ActionError({
                type: 'no_credit_notes',
                message: 'No credit notes returned in response'
            });
        }

        const firstCreditNote = creditNotesArray[0];
        if (typeof firstCreditNote !== 'object' || firstCreditNote === null) {
            throw new nango.ActionError({
                type: 'invalid_credit_note',
                message: 'Invalid credit note data in response'
            });
        }

        // Extract contact ID from nested Contact object
        let contactId: string | null = null;
        const contactObj = firstCreditNote['Contact'];
        if (typeof contactObj === 'object' && contactObj !== null) {
            const contactIdValue = contactObj['ContactID'];
            if (typeof contactIdValue === 'string') {
                contactId = contactIdValue;
            }
        }

        return {
            credit_note_id: typeof firstCreditNote['CreditNoteID'] === 'string' ? firstCreditNote['CreditNoteID'] : input.credit_note_id,
            credit_note_number: typeof firstCreditNote['CreditNoteNumber'] === 'string' ? firstCreditNote['CreditNoteNumber'] : null,
            type: typeof firstCreditNote['Type'] === 'string' ? firstCreditNote['Type'] : null,
            status: typeof firstCreditNote['Status'] === 'string' ? firstCreditNote['Status'] : null,
            date: typeof firstCreditNote['Date'] === 'string' ? firstCreditNote['Date'] : null,
            contact_id: contactId,
            reference: typeof firstCreditNote['Reference'] === 'string' ? firstCreditNote['Reference'] : null,
            total: typeof firstCreditNote['Total'] === 'number' ? firstCreditNote['Total'] : null,
            sub_total: typeof firstCreditNote['SubTotal'] === 'number' ? firstCreditNote['SubTotal'] : null,
            total_tax: typeof firstCreditNote['TotalTax'] === 'number' ? firstCreditNote['TotalTax'] : null,
            updated_date_utc: typeof firstCreditNote['UpdatedDateUTC'] === 'string' ? firstCreditNote['UpdatedDateUTC'] : null,
            remaining_credit: typeof firstCreditNote['RemainingCredit'] === 'number' ? firstCreditNote['RemainingCredit'] : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
