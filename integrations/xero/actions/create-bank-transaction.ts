import { z } from 'zod';
import { createAction } from 'nango';

const LineItemSchema = z.object({
    description: z.string().describe('Line item description. Example: "Office supplies"'),
    quantity: z.number().optional().describe('Quantity of items. Example: 2'),
    unitAmount: z.number().describe('Price per unit. Example: 50.00'),
    accountCode: z.string().describe('Account code for the line item. Example: "200"'),
    taxType: z.string().optional().describe('Tax type for the line item. Example: "OUTPUT"'),
    itemCode: z.string().optional().describe('Item code if referencing an existing item.')
});

const BankAccountSchema = z
    .object({
        code: z.string().optional().describe('Account code of the bank account. Example: "090"'),
        accountId: z.string().optional().describe('Account ID of the bank account. Example: "00000000-0000-0000-0000-000000000000"')
    })
    .refine((data) => data.code || data.accountId, {
        message: 'Either code or accountId must be provided for BankAccount'
    });

const ContactSchema = z
    .object({
        contactId: z.string().optional().describe('Contact ID. Example: "00000000-0000-0000-0000-000000000000"'),
        name: z.string().optional().describe('Contact name (required if contactId not provided). Example: "Acme Corporation"')
    })
    .refine((data) => data.contactId || data.name, {
        message: 'Either contactId or name must be provided for Contact'
    });

const InputSchema = z.object({
    type: z.enum(['SPEND', 'RECEIVE']).describe('Type of bank transaction. Example: "SPEND"'),
    contact: ContactSchema.describe('Contact for the transaction'),
    bankAccount: BankAccountSchema.describe('Bank account for the transaction'),
    lineItems: z.array(LineItemSchema).min(1).describe('Array of line items for the transaction'),
    date: z.string().optional().describe('Transaction date in YYYY-MM-DD format. Defaults to today.'),
    reference: z.string().optional().describe('Reference for the transaction. Example: "INV-001"'),
    currencyCode: z.string().optional().describe('Currency code. Example: "USD"'),
    status: z.enum(['AUTHORISED', 'DELETED']).optional().describe('Status of the transaction. Defaults to AUTHORISED.'),
    isReconciled: z.boolean().optional().describe('Whether the transaction is reconciled.'),
    url: z.string().optional().describe('URL link for the transaction.')
});

const OutputSchema = z.object({
    bankTransactionId: z.string().describe('Unique identifier for the bank transaction'),
    type: z.enum(['SPEND', 'RECEIVE']).describe('Type of bank transaction'),
    contactId: z.union([z.string(), z.null()]).describe('Contact ID'),
    contactName: z.union([z.string(), z.null()]).describe('Contact name'),
    bankAccountId: z.union([z.string(), z.null()]).describe('Bank account ID'),
    bankAccountCode: z.union([z.string(), z.null()]).describe('Bank account code'),
    date: z.string().describe('Transaction date'),
    reference: z.union([z.string(), z.null()]).describe('Transaction reference'),
    currencyCode: z.union([z.string(), z.null()]).describe('Currency code'),
    status: z.string().describe('Transaction status'),
    lineAmountTypes: z.union([z.string(), z.null()]).describe('Line amount types'),
    subTotal: z.number().describe('Sub total amount'),
    totalTax: z.number().describe('Total tax amount'),
    total: z.number().describe('Total amount'),
    isReconciled: z.boolean().describe('Whether transaction is reconciled'),
    lineItems: z
        .array(
            z.object({
                lineItemId: z.string(),
                description: z.union([z.string(), z.null()]),
                quantity: z.number(),
                unitAmount: z.number(),
                accountCode: z.union([z.string(), z.null()]),
                taxType: z.union([z.string(), z.null()]),
                lineAmount: z.number()
            })
        )
        .describe('Array of line items'),
    createdAt: z.union([z.string(), z.null()]).describe('Creation timestamp'),
    updatedAt: z.union([z.string(), z.null()]).describe('Update timestamp')
});

const ConnectionSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    tenantName: z.string().optional(),
    tenantType: z.string().optional()
});

// @allowTryCatch This helper is used to resolve tenant ID from metadata or connections API
async function resolveTenantId(nango: {
    getMetadata: () => Promise<unknown>;
    getConnection: () => Promise<unknown>;
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
    ActionError: new (payload: Record<string, unknown>) => Error;
}): Promise<string> {
    // Check connection_config for tenant_id first
    const connectionConfigResult = await nango.getConnection();
    if (connectionConfigResult && typeof connectionConfigResult === 'object') {
        const configValidation = z
            .object({
                connection_config: z.object({
                    tenant_id: z.string()
                })
            })
            .safeParse(connectionConfigResult);
        if (configValidation.success) {
            return configValidation.data.connection_config.tenant_id;
        }
    }

    // Check metadata for tenantId
    const metadataResult = await nango.getMetadata();
    const metadataValidation = z.object({ tenantId: z.string() }).safeParse(metadataResult);
    if (metadataValidation.success) {
        return metadataValidation.data.tenantId;
    }

    // https://developer.xero.com/documentation/api/accounting/overview#connections
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    // Validate that response data is an array
    const rawData = connectionsResponse.data;
    if (!Array.isArray(rawData)) {
        throw new nango.ActionError({
            type: 'invalid_connections_response',
            message: 'Connections response is not an array'
        });
    }

    // Validate each connection in the array
    const connections: Array<z.infer<typeof ConnectionSchema>> = [];
    for (const item of rawData) {
        const parsed = ConnectionSchema.safeParse(item);
        if (parsed.success) {
            connections.push(parsed.data);
        }
    }

    if (connections.length === 0) {
        throw new nango.ActionError({
            type: 'no_tenant',
            message: 'No Xero tenant found for this connection.'
        });
    }

    if (connections.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    // connections.length === 1 at this point, but TypeScript needs help
    const connection = connections[0];
    if (!connection) {
        throw new nango.ActionError({
            type: 'no_tenant',
            message: 'No Xero tenant found for this connection.'
        });
    }

    return connection.tenantId;
}

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
        const tenantId = await resolveTenantId(nango);

        const bankTransactionPayload = {
            Type: input.type,
            Contact: input.contact.contactId ? { ContactID: input.contact.contactId } : { Name: input.contact.name },
            BankAccount: input.bankAccount.accountId ? { AccountID: input.bankAccount.accountId } : { Code: input.bankAccount.code },
            LineItems: input.lineItems.map((item) => ({
                Description: item.description,
                Quantity: item.quantity ?? 1,
                UnitAmount: item.unitAmount,
                AccountCode: item.accountCode,
                ...(item.taxType && { TaxType: item.taxType }),
                ...(item.itemCode && { ItemCode: item.itemCode })
            })),
            ...(input.date && { Date: input.date }),
            ...(input.reference && { Reference: input.reference }),
            ...(input.currencyCode && { CurrencyCode: input.currencyCode }),
            ...(input.status && { Status: input.status }),
            ...(input.isReconciled !== undefined && { IsReconciled: input.isReconciled }),
            ...(input.url && { Url: input.url })
        };

        // https://developer.xero.com/documentation/api/accounting/banktransactions
        const response = await nango.put({
            endpoint: 'api.xro/2.0/BankTransactions',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                BankTransactions: [bankTransactionPayload]
            },
            retries: 3
        });

        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero API'
            });
        }

        const bankTransactions = responseData.BankTransactions;
        if (!Array.isArray(bankTransactions) || bankTransactions.length === 0) {
            throw new nango.ActionError({
                type: 'no_transactions_created',
                message: 'No bank transactions were created'
            });
        }

        const transaction = bankTransactions[0];

        // Handle validation errors if present
        if (transaction.ValidationErrors && Array.isArray(transaction.ValidationErrors) && transaction.ValidationErrors.length > 0) {
            const errors = transaction.ValidationErrors.map((e: { Message?: string }) => e.Message || 'Unknown validation error');
            throw new nango.ActionError({
                type: 'validation_error',
                message: `Validation errors: ${errors.join(', ')}`,
                errors: transaction.ValidationErrors
            });
        }

        const lineItems = transaction.LineItems || [];
        const parsedLineItems = lineItems.map((item: Record<string, unknown>) => ({
            lineItemId: typeof item['LineItemID'] === 'string' ? item['LineItemID'] : '',
            description: typeof item['Description'] === 'string' ? item['Description'] : null,
            quantity: typeof item['Quantity'] === 'number' ? item['Quantity'] : 0,
            unitAmount: typeof item['UnitAmount'] === 'number' ? item['UnitAmount'] : 0,
            accountCode: typeof item['AccountCode'] === 'string' ? item['AccountCode'] : null,
            taxType: typeof item['TaxType'] === 'string' ? item['TaxType'] : null,
            lineAmount: typeof item['LineAmount'] === 'number' ? item['LineAmount'] : 0
        }));

        return {
            bankTransactionId: typeof transaction.BankTransactionID === 'string' ? transaction.BankTransactionID : '',
            type: transaction.Type === 'SPEND' || transaction.Type === 'RECEIVE' ? transaction.Type : 'SPEND',
            contactId: transaction.Contact && typeof transaction.Contact.ContactID === 'string' ? transaction.Contact.ContactID : null,
            contactName: transaction.Contact && typeof transaction.Contact.Name === 'string' ? transaction.Contact.Name : null,
            bankAccountId: transaction.BankAccount && typeof transaction.BankAccount.AccountID === 'string' ? transaction.BankAccount.AccountID : null,
            bankAccountCode: transaction.BankAccount && typeof transaction.BankAccount.Code === 'string' ? transaction.BankAccount.Code : null,
            date: typeof transaction.Date === 'string' ? transaction.Date : '',
            reference: typeof transaction.Reference === 'string' ? transaction.Reference : null,
            currencyCode: typeof transaction.CurrencyCode === 'string' ? transaction.CurrencyCode : null,
            status: typeof transaction.Status === 'string' ? transaction.Status : 'UNKNOWN',
            lineAmountTypes: typeof transaction.LineAmountTypes === 'string' ? transaction.LineAmountTypes : null,
            subTotal: typeof transaction.SubTotal === 'number' ? transaction.SubTotal : 0,
            totalTax: typeof transaction.TotalTax === 'number' ? transaction.TotalTax : 0,
            total: typeof transaction.Total === 'number' ? transaction.Total : 0,
            isReconciled: typeof transaction.IsReconciled === 'boolean' ? transaction.IsReconciled : false,
            lineItems: parsedLineItems,
            createdAt: typeof transaction.CreatedDateUTC === 'string' ? transaction.CreatedDateUTC : null,
            updatedAt: typeof transaction.UpdatedDateUTC === 'string' ? transaction.UpdatedDateUTC : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
