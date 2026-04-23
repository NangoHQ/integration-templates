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
    bankTransactionId: z.string().describe('The unique ID of the bank transaction to update. Example: "a54d1234-5678-90ab-cdef-1234567890ab"'),
    type: z
        .enum(['RECEIVE', 'SPEND', 'RECEIVE-OVERPAYMENT', 'RECEIVE-PREPAYMENT', 'SPEND-OVERPAYMENT', 'SPEND-PREPAYMENT', 'TRANSFER'])
        .optional()
        .describe('The type of bank transaction.'),
    contactId: z.string().optional().describe('The ID of the contact associated with the transaction.'),
    lineItems: z
        .array(
            z.object({
                description: z.string().optional(),
                quantity: z.number().optional(),
                unitAmount: z.number().optional(),
                accountCode: z.string().optional(),
                itemCode: z.string().optional(),
                taxType: z.string().optional()
            })
        )
        .optional()
        .describe('The line items for the transaction.'),
    bankAccountId: z.string().optional().describe('The ID of the bank account.'),
    date: z.string().optional().describe('The date of the transaction (YYYY-MM-DD).'),
    reference: z.string().optional().describe('A reference for the transaction.'),
    status: z.enum(['AUTHORISED', 'DELETED']).optional().describe('The status of the transaction.')
});

const BankTransactionLineItemOutputSchema = z.object({
    description: z.string().optional(),
    quantity: z.number().optional(),
    unitAmount: z.number().optional(),
    accountCode: z.string().optional(),
    itemCode: z.string().optional(),
    taxType: z.string().optional(),
    taxAmount: z.number().optional(),
    lineAmount: z.number().optional()
});

const BankAccountOutputSchema = z.object({
    accountId: z.string(),
    code: z.string().optional(),
    name: z.string().optional()
});

const ContactOutputSchema = z.object({
    contactId: z.string(),
    name: z.string().optional()
});

const BankTransactionOutputSchema = z.object({
    bankTransactionId: z.string(),
    type: z.string(),
    contact: ContactOutputSchema.optional(),
    date: z.string().optional(),
    status: z.string().optional(),
    lineItems: z.array(BankTransactionLineItemOutputSchema).optional(),
    bankAccount: BankAccountOutputSchema.optional(),
    currencyCode: z.string().optional(),
    currencyRate: z.number().optional(),
    subTotal: z.number().optional(),
    totalTax: z.number().optional(),
    total: z.number().optional(),
    reference: z.string().optional(),
    isReconciled: z.boolean().optional(),
    hasAttachments: z.boolean().optional()
});

const UpdateBankTransactionOutputSchema = z.object({
    bankTransaction: BankTransactionOutputSchema
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

        const lineItems = input.lineItems?.map((item) => ({
            Description: item.description,
            Quantity: item.quantity,
            UnitAmount: item.unitAmount,
            AccountCode: item.accountCode,
            ItemCode: item.itemCode,
            TaxType: item.taxType
        }));

        const requestBody: Record<string, unknown> = {
            BankTransactions: [
                {
                    BankTransactionID: input.bankTransactionId,
                    ...(input.type && { Type: input.type }),
                    ...(input.contactId && { Contact: { ContactID: input.contactId } }),
                    ...(lineItems && { LineItems: lineItems }),
                    ...(input.bankAccountId && { BankAccount: { AccountID: input.bankAccountId } }),
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
        const contact: { contactId: string; name?: string } | undefined =
            typeof contactId === 'string'
                ? {
                      contactId: contactId,
                      ...(typeof contactName === 'string' ? { name: contactName } : {})
                  }
                : undefined;

        const bankAccountData = transaction['BankAccount'];
        const bankAccountCode = isNonNullObject(bankAccountData) ? bankAccountData['Code'] : undefined;
        const bankAccountName = isNonNullObject(bankAccountData) ? bankAccountData['Name'] : undefined;
        const bankAccountId = isNonNullObject(bankAccountData) ? bankAccountData['AccountID'] : undefined;
        const bankAccount: { accountId: string; code?: string; name?: string } | undefined =
            typeof bankAccountId === 'string'
                ? {
                      accountId: bankAccountId,
                      ...(typeof bankAccountCode === 'string' ? { code: bankAccountCode } : {}),
                      ...(typeof bankAccountName === 'string' ? { name: bankAccountName } : {})
                  }
                : undefined;

        const lineItemsData = transaction['LineItems'];
        const mappedLineItems: Array<{
            description?: string;
            quantity?: number;
            unitAmount?: number;
            accountCode?: string;
            itemCode?: string;
            taxType?: string;
            taxAmount?: number;
            lineAmount?: number;
        }> = [];

        if (Array.isArray(lineItemsData)) {
            for (const item of lineItemsData) {
                if (isNonNullObject(item)) {
                    const mappedItem: {
                        description?: string;
                        quantity?: number;
                        unitAmount?: number;
                        accountCode?: string;
                        itemCode?: string;
                        taxType?: string;
                        taxAmount?: number;
                        lineAmount?: number;
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
                        mappedItem.unitAmount = unitAmount;
                    }

                    const accountCode = item['AccountCode'];
                    if (typeof accountCode === 'string') {
                        mappedItem.accountCode = accountCode;
                    }

                    const itemCode = item['ItemCode'];
                    if (typeof itemCode === 'string') {
                        mappedItem.itemCode = itemCode;
                    }

                    const taxType = item['TaxType'];
                    if (typeof taxType === 'string') {
                        mappedItem.taxType = taxType;
                    }

                    const taxAmount = item['TaxAmount'];
                    if (typeof taxAmount === 'number') {
                        mappedItem.taxAmount = taxAmount;
                    }

                    const lineAmount = item['LineAmount'];
                    if (typeof lineAmount === 'number') {
                        mappedItem.lineAmount = lineAmount;
                    }

                    mappedLineItems.push(mappedItem);
                }
            }
        }

        const result: { bankTransaction: z.infer<typeof BankTransactionOutputSchema> } = {
            bankTransaction: {
                bankTransactionId: typeof transaction['BankTransactionID'] === 'string' ? transaction['BankTransactionID'] : '',
                type: typeof transaction['Type'] === 'string' ? transaction['Type'] : '',
                date: typeof transaction['Date'] === 'string' ? transaction['Date'] : undefined,
                status: typeof transaction['Status'] === 'string' ? transaction['Status'] : undefined,
                currencyCode: typeof transaction['CurrencyCode'] === 'string' ? transaction['CurrencyCode'] : undefined,
                currencyRate: typeof transaction['CurrencyRate'] === 'number' ? transaction['CurrencyRate'] : undefined,
                subTotal: typeof transaction['SubTotal'] === 'number' ? transaction['SubTotal'] : undefined,
                totalTax: typeof transaction['TotalTax'] === 'number' ? transaction['TotalTax'] : undefined,
                total: typeof transaction['Total'] === 'number' ? transaction['Total'] : undefined,
                reference: typeof transaction['Reference'] === 'string' ? transaction['Reference'] : undefined,
                isReconciled: typeof transaction['IsReconciled'] === 'boolean' ? transaction['IsReconciled'] : undefined,
                hasAttachments: typeof transaction['HasAttachments'] === 'boolean' ? transaction['HasAttachments'] : undefined
            }
        };

        if (contact !== undefined) {
            result.bankTransaction.contact = contact;
        }

        if (bankAccount !== undefined) {
            result.bankTransaction.bankAccount = bankAccount;
        }

        if (mappedLineItems.length > 0) {
            result.bankTransaction.lineItems = mappedLineItems;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
