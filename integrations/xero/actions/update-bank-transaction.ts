import { z } from 'zod';
import { createAction } from 'nango';

const ConnectionResponseSchema = z.object({
    data: z.array(
        z.object({
            id: z.string(),
            tenantId: z.string(),
            tenantName: z.string()
        })
    )
});

const BankTransactionInputSchema = z.object({
    bank_transaction_id: z.string().describe('The unique ID of the bank transaction to update. Example: "a54d1234-5678-90ab-cdef-1234567890ab"'),
    type: z
        .enum(['RECEIVE', 'SPEND', 'RECEIVE-OVERPAYMENT', 'RECEIVE-PREPAYMENT', 'SPEND-OVERPAYMENT', 'SPEND-PREPAYMENT', 'TRANSFER'])
        .optional()
        .describe('The type of bank transaction.'),
    contact_id: z.string().optional().describe('The ID of the contact associated with the transaction.'),
    line_items: z
        .array(
            z.object({
                description: z.string().optional(),
                quantity: z.number().optional(),
                unit_amount: z.number().optional(),
                account_code: z.string().optional(),
                item_code: z.string().optional(),
                tax_type: z.string().optional()
            })
        )
        .optional()
        .describe('The line items for the transaction.'),
    bank_account_id: z.string().optional().describe('The ID of the bank account.'),
    date: z.string().optional().describe('The date of the transaction (YYYY-MM-DD).'),
    reference: z.string().optional().describe('A reference for the transaction.'),
    status: z.enum(['AUTHORISED', 'DELETED']).optional().describe('The status of the transaction.')
});

const BankTransactionLineItemOutputSchema = z.object({
    description: z.string().optional(),
    quantity: z.number().optional(),
    unit_amount: z.number().optional(),
    account_code: z.string().optional(),
    item_code: z.string().optional(),
    tax_type: z.string().optional(),
    tax_amount: z.number().optional(),
    line_amount: z.number().optional()
});

const BankAccountOutputSchema = z.object({
    account_id: z.string(),
    code: z.string().optional(),
    name: z.string().optional()
});

const ContactOutputSchema = z.object({
    contact_id: z.string(),
    name: z.string().optional()
});

const BankTransactionOutputSchema = z.object({
    bank_transaction_id: z.string(),
    type: z.string(),
    contact: ContactOutputSchema.optional(),
    date: z.string().optional(),
    status: z.string().optional(),
    line_items: z.array(BankTransactionLineItemOutputSchema).optional(),
    bank_account: BankAccountOutputSchema.optional(),
    currency_code: z.string().optional(),
    currency_rate: z.number().optional(),
    sub_total: z.number().optional(),
    total_tax: z.number().optional(),
    total: z.number().optional(),
    reference: z.string().optional(),
    is_reconciled: z.boolean().optional(),
    has_attachments: z.boolean().optional()
});

const UpdateBankTransactionOutputSchema = z.object({
    bank_transaction: BankTransactionOutputSchema
});

function isNonNullObject(value: unknown): value is { [key: string]: unknown } {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const action = createAction({
    description: 'Update an existing bank transaction.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-bank-transaction',
        group: 'Bank Transactions'
    },
    input: BankTransactionInputSchema,
    output: UpdateBankTransactionOutputSchema,
    scopes: ['accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof UpdateBankTransactionOutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const config = connection.connection_config;
        if (isNonNullObject(config)) {
            const tenantIdValue = config['tenant_id'];
            if (typeof tenantIdValue === 'string') {
                tenantId = tenantIdValue;
            }
        }

        const metadata = connection.metadata;
        if (!tenantId && isNonNullObject(metadata)) {
            const tenantIdValue = metadata['tenantId'];
            if (typeof tenantIdValue === 'string') {
                tenantId = tenantIdValue;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionResponseSchema.safeParse(connectionsResponse.data);

            if (!parsedConnections.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse connections response from Xero API'
                });
            }

            const connections = parsedConnections.data.data;

            if (connections.length === 0) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connections[0];
            if (!firstConnection) {
                throw new nango.ActionError({
                    type: 'no_tenant',
                    message: 'No Xero tenant found for this connection.'
                });
            }

            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Could not resolve Xero tenant ID. Please configure tenant_id in connection_config or tenantId in metadata.'
            });
        }

        const lineItems = input.line_items?.map((item) => ({
            Description: item.description,
            Quantity: item.quantity,
            UnitAmount: item.unit_amount,
            AccountCode: item.account_code,
            ItemCode: item.item_code,
            TaxType: item.tax_type
        }));

        const requestBody: Record<string, unknown> = {
            BankTransactions: [
                {
                    BankTransactionID: input.bank_transaction_id,
                    ...(input.type && { Type: input.type }),
                    ...(input.contact_id && { Contact: { ContactID: input.contact_id } }),
                    ...(lineItems && { LineItems: lineItems }),
                    ...(input.bank_account_id && { BankAccount: { AccountID: input.bank_account_id } }),
                    ...(input.date && { Date: input.date }),
                    ...(input.reference && { Reference: input.reference }),
                    ...(input.status && { Status: input.status })
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/banktransactions
        const response = await nango.post({
            endpoint: 'api.xro/2.0/BankTransactions',
            data: requestBody,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from Xero API'
            });
        }

        const responseData = isNonNullObject(response.data) ? response.data : {};
        const bankTransactions = responseData['BankTransactions'];

        if (!Array.isArray(bankTransactions) || bankTransactions.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'No bank transaction returned from Xero API'
            });
        }

        const bt = bankTransactions[0];

        if (!isNonNullObject(bt)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid bank transaction data returned from Xero API'
            });
        }

        const transaction = bt;

        const contactData = transaction['Contact'];
        const contactName = isNonNullObject(contactData) ? contactData['Name'] : undefined;
        const contactId = isNonNullObject(contactData) ? contactData['ContactID'] : undefined;
        const contact: { contact_id: string; name?: string } | undefined =
            typeof contactId === 'string'
                ? {
                      contact_id: contactId,
                      ...(typeof contactName === 'string' ? { name: contactName } : {})
                  }
                : undefined;

        const bankAccountData = transaction['BankAccount'];
        const bankAccountCode = isNonNullObject(bankAccountData) ? bankAccountData['Code'] : undefined;
        const bankAccountName = isNonNullObject(bankAccountData) ? bankAccountData['Name'] : undefined;
        const bankAccountId = isNonNullObject(bankAccountData) ? bankAccountData['AccountID'] : undefined;
        const bankAccount: { account_id: string; code?: string; name?: string } | undefined =
            typeof bankAccountId === 'string'
                ? {
                      account_id: bankAccountId,
                      ...(typeof bankAccountCode === 'string' ? { code: bankAccountCode } : {}),
                      ...(typeof bankAccountName === 'string' ? { name: bankAccountName } : {})
                  }
                : undefined;

        const lineItemsData = transaction['LineItems'];
        const mappedLineItems: Array<{
            description?: string;
            quantity?: number;
            unit_amount?: number;
            account_code?: string;
            item_code?: string;
            tax_type?: string;
            tax_amount?: number;
            line_amount?: number;
        }> = [];

        if (Array.isArray(lineItemsData)) {
            for (const item of lineItemsData) {
                if (isNonNullObject(item)) {
                    const mappedItem: {
                        description?: string;
                        quantity?: number;
                        unit_amount?: number;
                        account_code?: string;
                        item_code?: string;
                        tax_type?: string;
                        tax_amount?: number;
                        line_amount?: number;
                    } = {};

                    const description = item['Description'];
                    if (typeof description === 'string') {
                        mappedItem.description = description;
                    }

                    const quantity = item['Quantity'];
                    if (typeof quantity === 'number') {
                        mappedItem.quantity = quantity;
                    }

                    const unitAmount = item['UnitAmount'];
                    if (typeof unitAmount === 'number') {
                        mappedItem.unit_amount = unitAmount;
                    }

                    const accountCode = item['AccountCode'];
                    if (typeof accountCode === 'string') {
                        mappedItem.account_code = accountCode;
                    }

                    const itemCode = item['ItemCode'];
                    if (typeof itemCode === 'string') {
                        mappedItem.item_code = itemCode;
                    }

                    const taxType = item['TaxType'];
                    if (typeof taxType === 'string') {
                        mappedItem.tax_type = taxType;
                    }

                    const taxAmount = item['TaxAmount'];
                    if (typeof taxAmount === 'number') {
                        mappedItem.tax_amount = taxAmount;
                    }

                    const lineAmount = item['LineAmount'];
                    if (typeof lineAmount === 'number') {
                        mappedItem.line_amount = lineAmount;
                    }

                    mappedLineItems.push(mappedItem);
                }
            }
        }

        const result: { bank_transaction: z.infer<typeof BankTransactionOutputSchema> } = {
            bank_transaction: {
                bank_transaction_id: typeof transaction['BankTransactionID'] === 'string' ? transaction['BankTransactionID'] : '',
                type: typeof transaction['Type'] === 'string' ? transaction['Type'] : '',
                date: typeof transaction['Date'] === 'string' ? transaction['Date'] : undefined,
                status: typeof transaction['Status'] === 'string' ? transaction['Status'] : undefined,
                currency_code: typeof transaction['CurrencyCode'] === 'string' ? transaction['CurrencyCode'] : undefined,
                currency_rate: typeof transaction['CurrencyRate'] === 'number' ? transaction['CurrencyRate'] : undefined,
                sub_total: typeof transaction['SubTotal'] === 'number' ? transaction['SubTotal'] : undefined,
                total_tax: typeof transaction['TotalTax'] === 'number' ? transaction['TotalTax'] : undefined,
                total: typeof transaction['Total'] === 'number' ? transaction['Total'] : undefined,
                reference: typeof transaction['Reference'] === 'string' ? transaction['Reference'] : undefined,
                is_reconciled: typeof transaction['IsReconciled'] === 'boolean' ? transaction['IsReconciled'] : undefined,
                has_attachments: typeof transaction['HasAttachments'] === 'boolean' ? transaction['HasAttachments'] : undefined
            }
        };

        if (contact !== undefined) {
            result.bank_transaction.contact = contact;
        }

        if (bankAccount !== undefined) {
            result.bank_transaction.bank_account = bankAccount;
        }

        if (mappedLineItems.length > 0) {
            result.bank_transaction.line_items = mappedLineItems;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
