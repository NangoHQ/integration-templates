import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    type: z.enum(['ACCPAYCREDIT', 'ACCRECCREDIT']).describe('Credit note type. ACCPAYCREDIT for accounts payable, ACCRECCREDIT for accounts receivable.'),
    contactId: z.string().describe('Contact ID for the credit note. Example: "430fa14a-f945-44d3-9f97-5df5e28441b8"'),
    date: z.string().describe('Date of the credit note in YYYY-MM-DD format. Example: "2024-01-15"'),
    lineItems: z
        .array(
            z.object({
                description: z.string().describe('Description of the line item.'),
                quantity: z.number().describe('Quantity of the item.'),
                unitAmount: z.number().describe('Unit price of the item.'),
                accountCode: z.string().describe('Account code for the line item. Example: "400"')
            })
        )
        .describe('Array of line items for the credit note.')
});

const OutputSchema = z.object({
    creditNoteId: z.string().describe('Unique identifier for the created credit note.'),
    creditNoteNumber: z.string().describe('Credit note number.'),
    type: z.string().describe('Type of credit note.'),
    status: z.string().describe('Status of the credit note.'),
    contactName: z.string().describe('Name of the contact.'),
    date: z.string().describe('Date of the credit note.'),
    total: z.number().describe('Total amount of the credit note.')
});

const action = createAction({
    description: 'Create a credit note for a contact.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-credit-note',
        group: 'Credit Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object' && 'tenant_id' in connection.connection_config) {
            tenantId = String(connection.connection_config['tenant_id']);
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object' && 'tenantId' in connection.metadata) {
            tenantId = String(connection.metadata['tenantId']);
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (connectionsData && typeof connectionsData === 'object' && 'data' in connectionsData) {
                const data = connectionsData['data'];
                if (Array.isArray(data)) {
                    if (data.length === 0) {
                        throw new nango.ActionError({
                            type: 'no_tenant_found',
                            message: 'No Xero tenant found for this connection.'
                        });
                    }
                    if (data.length > 1) {
                        throw new nango.ActionError({
                            type: 'multiple_tenants',
                            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                        });
                    }
                    const firstConnection = data[0];
                    if (firstConnection && typeof firstConnection === 'object' && 'tenantId' in firstConnection) {
                        tenantId = String(firstConnection['tenantId']);
                    }
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'no_tenant_found',
                message: 'Could not resolve Xero tenant ID.'
            });
        }

        const creditNotePayload = {
            CreditNotes: [
                {
                    Type: input.type,
                    Contact: {
                        ContactID: input.contactId
                    },
                    Date: input.date,
                    LineItems: input.lineItems.map((item) => ({
                        Description: item.description,
                        Quantity: item.quantity,
                        UnitAmount: item.unitAmount,
                        AccountCode: item.accountCode
                    }))
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const response = await nango.put({
            endpoint: 'api.xro/2.0/CreditNotes',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: creditNotePayload,
            retries: 3
        });

        const responseData = response.data;

        if (!responseData || typeof responseData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API.'
            });
        }

        const creditNotes = 'CreditNotes' in responseData ? responseData['CreditNotes'] : undefined;
        if (!Array.isArray(creditNotes) || creditNotes.length === 0) {
            throw new nango.ActionError({
                type: 'no_credit_note_created',
                message: 'No credit note was created.'
            });
        }

        const createdCreditNote = creditNotes[0];
        if (!createdCreditNote || typeof createdCreditNote !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_credit_note',
                message: 'Invalid credit note data in response.'
            });
        }

        const contactObj =
            'Contact' in createdCreditNote && createdCreditNote['Contact'] && typeof createdCreditNote['Contact'] === 'object'
                ? createdCreditNote['Contact']
                : undefined;

        return {
            creditNoteId: 'CreditNoteID' in createdCreditNote ? String(createdCreditNote['CreditNoteID']) : '',
            creditNoteNumber: 'CreditNoteNumber' in createdCreditNote ? String(createdCreditNote['CreditNoteNumber']) : '',
            type: 'Type' in createdCreditNote ? String(createdCreditNote['Type']) : '',
            status: 'Status' in createdCreditNote ? String(createdCreditNote['Status']) : '',
            contactName: contactObj && 'Name' in contactObj ? String(contactObj['Name']) : '',
            date: 'Date' in createdCreditNote ? String(createdCreditNote['Date']) : '',
            total: 'Total' in createdCreditNote ? Number(createdCreditNote['Total']) : 0
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
