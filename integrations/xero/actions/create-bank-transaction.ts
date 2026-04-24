import { z } from 'zod';
import { createAction } from 'nango';

const LineItemInputSchema = z.object({
    description: z.string().describe('Line item description. Example: "Office supplies"'),
    quantity: z.number().optional().describe('Quantity. Example: 1'),
    unit_amount: z.number().optional().describe('Unit amount. Example: 20.0'),
    account_code: z.string().describe('Account code. Example: "000"'),
    tax_type: z.string().optional().describe('Tax type. Example: "NONE"')
});

const InputSchema = z.object({
    type: z.enum(['SPEND', 'RECEIVE']).describe('Type of bank transaction. Example: "SPEND"'),
    contact_id: z.string().describe('Contact ID. Example: "00000000-0000-0000-0000-000000000000"'),
    bank_account_code: z.string().optional().describe('Bank account code. Example: "088"'),
    bank_account_id: z.string().optional().describe('Bank account ID. Example: "00000000-0000-0000-0000-000000000000"'),
    date: z.string().describe('Transaction date in YYYY-MM-DD format. Example: "2024-01-15"'),
    reference: z.string().optional().describe('Reference for the transaction. Example: "Invoice 123"'),
    line_items: z.array(LineItemInputSchema).min(1).describe('Line items for the transaction')
});

const LineItemSchema = z.object({
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional(),
    TaxAmount: z.number().optional(),
    LineAmount: z.number().optional(),
    LineItemID: z.string().optional()
});

const BankAccountSchema = z.object({
    AccountID: z.string().optional(),
    Code: z.string().optional(),
    Name: z.string().optional()
});

const ContactSchema = z.object({
    ContactID: z.string().optional(),
    Name: z.string().optional()
});

const BankTransactionSchema = z.object({
    BankTransactionID: z.string().optional(),
    Type: z.string().optional(),
    Status: z.string().optional(),
    Contact: ContactSchema.optional(),
    BankAccount: BankAccountSchema.optional(),
    Date: z.string().optional(),
    Reference: z.string().optional(),
    LineItems: z.array(LineItemSchema).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    CurrencyCode: z.string().optional(),
    ValidationErrors: z.array(z.object({ Message: z.string() })).optional()
});

const BankTransactionsResponseSchema = z.object({
    BankTransactions: z.array(BankTransactionSchema)
});

const OutputSchema = z.object({
    bank_transaction_id: z.string(),
    type: z.string(),
    status: z.string(),
    contact_id: z.string().optional(),
    contact_name: z.string().optional(),
    bank_account_id: z.string().optional(),
    bank_account_code: z.string().optional(),
    bank_account_name: z.string().optional(),
    date: z.string().optional(),
    reference: z.string().optional(),
    sub_total: z.number().optional(),
    total_tax: z.number().optional(),
    total: z.number().optional(),
    currency_code: z.string().optional(),
    line_items: z
        .array(
            z.object({
                line_item_id: z.string().optional(),
                description: z.string().optional(),
                quantity: z.number().optional(),
                unit_amount: z.number().optional(),
                account_code: z.string().optional(),
                tax_type: z.string().optional(),
                tax_amount: z.number().optional(),
                line_amount: z.number().optional()
            })
        )
        .optional(),
    validation_errors: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a spend or receive money bank transaction',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-bank-transaction',
        group: 'Bank Transactions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        if (typeof connection.connection_config === 'object' && connection.connection_config !== null && 'tenant_id' in connection.connection_config) {
            tenantId = String(connection.connection_config['tenant_id']);
        }

        if (!tenantId && typeof connection.metadata === 'object' && connection.metadata !== null && 'tenantId' in connection.metadata) {
            tenantId = String(connection.metadata['tenantId']);
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: '/connections',
                baseUrlOverride: 'https://api.xero.com',
                retries: 10
            });

            const connectionsData = z.array(z.object({ tenantId: z.string() })).parse(connectionsResponse.data);

            if (connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsData[0];
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found.'
                });
            }

            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Could not resolve Xero tenant ID.'
            });
        }

        if (!input.bank_account_code && !input.bank_account_id) {
            throw new nango.ActionError({
                type: 'missing_bank_account',
                message: 'Either bank_account_code or bank_account_id is required.'
            });
        }

        const bankAccount: Record<string, string> = {};
        if (input.bank_account_code !== undefined) {
            bankAccount['Code'] = input.bank_account_code;
        }
        if (input.bank_account_id !== undefined) {
            bankAccount['AccountID'] = input.bank_account_id;
        }

        const lineItems = input.line_items.map((item) => ({
            Description: item.description,
            ...(item.quantity !== undefined && { Quantity: item.quantity }),
            ...(item.unit_amount !== undefined && { UnitAmount: item.unit_amount }),
            AccountCode: item.account_code,
            ...(item.tax_type !== undefined && { TaxType: item.tax_type })
        }));

        const requestBody = {
            BankTransactions: [
                {
                    Type: input.type,
                    Contact: {
                        ContactID: input.contact_id
                    },
                    LineItems: lineItems,
                    BankAccount: bankAccount,
                    Date: input.date,
                    ...(input.reference !== undefined && { Reference: input.reference })
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/banktransactions
        const response = await nango.put({
            endpoint: 'api.xro/2.0/BankTransactions',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: requestBody,
            retries: 10
        });

        const parsed = BankTransactionsResponseSchema.parse(response.data);

        if (!parsed.BankTransactions || parsed.BankTransactions.length === 0) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'No bank transaction was returned from Xero.'
            });
        }

        const bt = parsed.BankTransactions[0];

        if (!bt) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'No bank transaction was returned from Xero.'
            });
        }

        if (!bt.BankTransactionID) {
            throw new nango.ActionError({
                type: 'missing_id',
                message: 'Created bank transaction is missing an ID.'
            });
        }

        const validationErrors = bt.ValidationErrors ? bt.ValidationErrors.map((e) => e.Message) : [];

        return {
            bank_transaction_id: bt.BankTransactionID,
            type: bt.Type || input.type,
            status: bt.Status || 'AUTHORISED',
            ...(bt.Contact?.ContactID !== undefined && { contact_id: bt.Contact.ContactID }),
            ...(bt.Contact?.Name !== undefined && { contact_name: bt.Contact.Name }),
            ...(bt.BankAccount?.AccountID !== undefined && { bank_account_id: bt.BankAccount.AccountID }),
            ...(bt.BankAccount?.Code !== undefined && { bank_account_code: bt.BankAccount.Code }),
            ...(bt.BankAccount?.Name !== undefined && { bank_account_name: bt.BankAccount.Name }),
            ...(bt.Date !== undefined && { date: bt.Date }),
            ...(bt.Reference !== undefined && { reference: bt.Reference }),
            ...(bt.SubTotal !== undefined && { sub_total: bt.SubTotal }),
            ...(bt.TotalTax !== undefined && { total_tax: bt.TotalTax }),
            ...(bt.Total !== undefined && { total: bt.Total }),
            ...(bt.CurrencyCode !== undefined && { currency_code: bt.CurrencyCode }),
            line_items:
                bt.LineItems?.map((item) => ({
                    ...(item.LineItemID !== undefined && { line_item_id: item.LineItemID }),
                    ...(item.Description !== undefined && { description: item.Description }),
                    ...(item.Quantity !== undefined && { quantity: item.Quantity }),
                    ...(item.UnitAmount !== undefined && { unit_amount: item.UnitAmount }),
                    ...(item.AccountCode !== undefined && { account_code: item.AccountCode }),
                    ...(item.TaxType !== undefined && { tax_type: item.TaxType }),
                    ...(item.TaxAmount !== undefined && { tax_amount: item.TaxAmount }),
                    ...(item.LineAmount !== undefined && { line_amount: item.LineAmount })
                })) || [],
            ...(validationErrors.length > 0 && { validation_errors: validationErrors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
