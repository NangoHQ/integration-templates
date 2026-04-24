import { z } from 'zod';
import { createAction } from 'nango';

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const XeroConnectionSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    authEventId: z.string().optional()
});

const LineItemInputSchema = z.object({
    description: z.string().optional(),
    quantity: z.number().optional(),
    unit_amount: z.number().optional(),
    account_code: z.string().optional(),
    tax_type: z.string().optional()
});

const InputSchema = z.object({
    bank_transaction_id: z.string().describe('The Xero BankTransactionID to update. Example: "00000000-0000-0000-0000-000000000000"'),
    type: z.string().optional().describe('Transaction type. Example: SPEND or RECEIVE'),
    contact_id: z.string().optional().describe('Contact ID to associate. Example: "00000000-0000-0000-0000-000000000000"'),
    bank_account_id: z.string().optional().describe('Bank account ID. Example: "00000000-0000-0000-0000-000000000000"'),
    date: z.string().optional().describe('Transaction date in YYYY-MM-DD format. Example: "2024-01-15"'),
    reference: z.string().optional().describe('Reference for the transaction. Example: "INV-001"'),
    status: z.string().optional().describe('Status. Example: AUTHORISED or DELETED'),
    line_items: z.array(LineItemInputSchema).optional()
});

const LineItemSchema = z.object({
    LineItemID: z.string().optional(),
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional()
});

const ContactSchema = z.object({
    ContactID: z.string().optional()
});

const BankAccountSchema = z.object({
    AccountID: z.string().optional(),
    Code: z.string().optional()
});

const BankTransactionSchema = z.object({
    BankTransactionID: z.string(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    Date: z.string().optional(),
    Reference: z.string().optional(),
    Contact: ContactSchema.optional(),
    BankAccount: BankAccountSchema.optional(),
    LineItems: z.array(LineItemSchema).optional(),
    UpdatedDateUTC: z.string().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional()
});

const ProviderResponseSchema = z.object({
    BankTransactions: z.array(BankTransactionSchema)
});

const OutputSchema = z.object({
    bank_transaction_id: z.string(),
    type: z.string().optional(),
    status: z.string().optional(),
    date: z.string().optional(),
    reference: z.string().optional(),
    contact_id: z.string().optional(),
    bank_account_id: z.string().optional(),
    updated_date_utc: z.string().optional(),
    sub_total: z.number().optional(),
    total_tax: z.number().optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'Update an existing bank transaction.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-bank-transaction',
        group: 'Bank Transactions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connectionResult = await nango.getConnection();
        const connection = ConnectionSchema.parse(connectionResult);

        let tenantId: string | undefined;
        const tenantIdFromConfig =
            connection.connection_config && typeof connection.connection_config['tenant_id'] === 'string'
                ? connection.connection_config['tenant_id']
                : undefined;
        if (tenantIdFromConfig) {
            tenantId = tenantIdFromConfig;
        }

        if (!tenantId) {
            const tenantIdFromMetadata =
                connection.metadata && typeof connection.metadata['tenantId'] === 'string' ? connection.metadata['tenantId'] : undefined;
            if (tenantIdFromMetadata) {
                tenantId = tenantIdFromMetadata;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/overview/guide#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = z.array(XeroConnectionSchema).parse(connectionsResponse.data);
            if (parsedConnections.length === 1 && parsedConnections[0] !== undefined) {
                tenantId = parsedConnections[0].tenantId;
            } else if (parsedConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'No Xero tenant found for this connection.'
            });
        }

        const bankTransaction: Record<string, unknown> = {
            BankTransactionID: input.bank_transaction_id
        };

        if (input.type !== undefined) {
            bankTransaction['Type'] = input.type;
        }
        if (input.contact_id !== undefined) {
            bankTransaction['Contact'] = { ContactID: input.contact_id };
        }
        if (input.bank_account_id !== undefined) {
            bankTransaction['BankAccount'] = { AccountID: input.bank_account_id };
        }
        if (input.date !== undefined) {
            bankTransaction['Date'] = input.date;
        }
        if (input.reference !== undefined) {
            bankTransaction['Reference'] = input.reference;
        }
        if (input.status !== undefined) {
            bankTransaction['Status'] = input.status;
        }
        if (input.line_items !== undefined) {
            bankTransaction['LineItems'] = input.line_items.map((item) => {
                const lineItem: Record<string, unknown> = {};
                if (item.description !== undefined) {
                    lineItem['Description'] = item.description;
                }
                if (item.quantity !== undefined) {
                    lineItem['Quantity'] = item.quantity;
                }
                if (item.unit_amount !== undefined) {
                    lineItem['UnitAmount'] = item.unit_amount;
                }
                if (item.account_code !== undefined) {
                    lineItem['AccountCode'] = item.account_code;
                }
                if (item.tax_type !== undefined) {
                    lineItem['TaxType'] = item.tax_type;
                }
                return lineItem;
            });
        }

        // https://developer.xero.com/documentation/api/accounting/banktransactions
        const response = await nango.post({
            endpoint: 'api.xro/2.0/BankTransactions',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                BankTransactions: [bankTransaction]
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const updated = providerResponse.BankTransactions[0];

        if (!updated) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No bank transaction returned in the update response.'
            });
        }

        return {
            bank_transaction_id: updated.BankTransactionID,
            ...(updated.Type !== undefined && { type: updated.Type }),
            ...(updated.Status !== undefined && { status: updated.Status }),
            ...(updated.Date !== undefined && { date: updated.Date }),
            ...(updated.Reference !== undefined && { reference: updated.Reference }),
            ...(updated.Contact !== undefined && updated.Contact.ContactID !== undefined && { contact_id: updated.Contact.ContactID }),
            ...(updated.BankAccount !== undefined && updated.BankAccount.AccountID !== undefined && { bank_account_id: updated.BankAccount.AccountID }),
            ...(updated.UpdatedDateUTC !== undefined && { updated_date_utc: updated.UpdatedDateUTC }),
            ...(updated.SubTotal !== undefined && { sub_total: updated.SubTotal }),
            ...(updated.TotalTax !== undefined && { total_tax: updated.TotalTax }),
            ...(updated.Total !== undefined && { total: updated.Total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
