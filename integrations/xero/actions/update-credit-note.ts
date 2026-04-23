import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    creditNoteId: z.string().describe('Xero generated unique identifier for the credit note. Example: "717f2bfc-c6d4-41fd-b238-3f2f0c0cf777"'),
    type: z
        .enum(['ACCRECCREDIT', 'ACCPAYCREDIT'])
        .optional()
        .describe('Type of credit note. ACCRECCREDIT for Accounts Receivable (sales credit notes), ACCPAYCREDIT for Accounts Payable (purchase credit notes).'),
    contactId: z.string().optional().describe('Contact ID associated with the credit note.'),
    date: z.string().optional().describe('Date of the credit note in YYYY-MM-DD format.'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED', 'DELETED']).optional().describe('Status of the credit note.'),
    lineItems: z
        .array(
            z.object({
                description: z.string().optional(),
                quantity: z.number().optional(),
                unitAmount: z.number().optional(),
                accountCode: z.string().optional(),
                taxType: z.string().optional()
            })
        )
        .optional()
        .describe('Line items for the credit note.'),
    reference: z.string().optional().describe('Reference or description for the credit note.'),
    sentToContact: z
        .boolean()
        .optional()
        .describe(
            'Boolean indicating whether the credit note has been sent to the contact. Only writable when credit note is in Awaiting Payment or Paid state.'
        ),
    currencyRate: z.number().optional().describe('Currency rate for multicurrency transactions.')
});

const OutputSchema = z.object({
    creditNoteId: z.string(),
    creditNoteNumber: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    status: z.union([z.string(), z.null()]),
    date: z.union([z.string(), z.null()]),
    contactId: z.union([z.string(), z.null()]),
    reference: z.union([z.string(), z.null()]),
    total: z.union([z.number(), z.null()]),
    subTotal: z.union([z.number(), z.null()]),
    totalTax: z.union([z.number(), z.null()]),
    updatedDateUtc: z.union([z.string(), z.null()]),
    remainingCredit: z.union([z.number(), z.null()])
});

const action = createAction({
    description: 'Update an existing credit note.',
    version: '3.0.0',
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
            CreditNoteID: input.creditNoteId
        };

        if (input.type) {
            creditNotePayload['Type'] = input.type;
        }
        if (input.contactId) {
            creditNotePayload['Contact'] = { ContactID: input.contactId };
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
        if (input.sentToContact !== undefined) {
            creditNotePayload['SentToContact'] = input.sentToContact;
        }
        if (input.currencyRate !== undefined) {
            creditNotePayload['CurrencyRate'] = input.currencyRate;
        }
        if (input.lineItems && input.lineItems.length > 0) {
            creditNotePayload['LineItems'] = input.lineItems.map((item) => ({
                Description: item.description,
                Quantity: item.quantity,
                UnitAmount: item.unitAmount,
                AccountCode: item.accountCode,
                TaxType: item.taxType
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
            creditNoteId: typeof firstCreditNote['CreditNoteID'] === 'string' ? firstCreditNote['CreditNoteID'] : input.creditNoteId,
            creditNoteNumber: typeof firstCreditNote['CreditNoteNumber'] === 'string' ? firstCreditNote['CreditNoteNumber'] : null,
            type: typeof firstCreditNote['Type'] === 'string' ? firstCreditNote['Type'] : null,
            status: typeof firstCreditNote['Status'] === 'string' ? firstCreditNote['Status'] : null,
            date: typeof firstCreditNote['Date'] === 'string' ? firstCreditNote['Date'] : null,
            contactId: contactId,
            reference: typeof firstCreditNote['Reference'] === 'string' ? firstCreditNote['Reference'] : null,
            total: typeof firstCreditNote['Total'] === 'number' ? firstCreditNote['Total'] : null,
            subTotal: typeof firstCreditNote['SubTotal'] === 'number' ? firstCreditNote['SubTotal'] : null,
            totalTax: typeof firstCreditNote['TotalTax'] === 'number' ? firstCreditNote['TotalTax'] : null,
            updatedDateUtc: typeof firstCreditNote['UpdatedDateUTC'] === 'string' ? firstCreditNote['UpdatedDateUTC'] : null,
            remainingCredit: typeof firstCreditNote['RemainingCredit'] === 'number' ? firstCreditNote['RemainingCredit'] : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
