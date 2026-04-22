import { z } from 'zod';
import { createAction } from 'nango';

const LineItemSchema = z.object({
    description: z.string().describe('Line item description. Example: "Office supplies"'),
    quantity: z.number().optional().describe('Quantity of items. Example: 2'),
    unit_amount: z.number().describe('Price per unit. Example: 50.00'),
    account_code: z.string().describe('Account code for the line item. Example: "200"'),
    tax_type: z.string().optional().describe('Tax type for the line item. Example: "OUTPUT"'),
    item_code: z.string().optional().describe('Item code if referencing an existing item.')
});

const BankAccountSchema = z
    .object({
        code: z.string().optional().describe('Account code of the bank account. Example: "090"'),
        account_id: z.string().optional().describe('Account ID of the bank account. Example: "00000000-0000-0000-0000-000000000000"')
    })
    .refine((data) => data.code || data.account_id, {
        message: 'Either code or account_id must be provided for BankAccount'
    });

const ContactSchema = z
    .object({
        contact_id: z.string().optional().describe('Contact ID. Example: "00000000-0000-0000-0000-000000000000"'),
        name: z.string().optional().describe('Contact name (required if contact_id not provided). Example: "Acme Corporation"')
    })
    .refine((data) => data.contact_id || data.name, {
        message: 'Either contact_id or name must be provided for Contact'
    });

const InputSchema = z.object({
    type: z.enum(['SPEND', 'RECEIVE']).describe('Type of bank transaction. Example: "SPEND"'),
    contact: ContactSchema.describe('Contact for the transaction'),
    bank_account: BankAccountSchema.describe('Bank account for the transaction'),
    line_items: z.array(LineItemSchema).min(1).describe('Array of line items for the transaction'),
    date: z.string().optional().describe('Transaction date in YYYY-MM-DD format. Defaults to today.'),
    reference: z.string().optional().describe('Reference for the transaction. Example: "INV-001"'),
    currency_code: z.string().optional().describe('Currency code. Example: "USD"'),
    status: z.enum(['AUTHORISED', 'DELETED', 'DRAFT']).optional().describe('Status of the transaction. Defaults to AUTHORISED.'),
    is_reconciled: z.boolean().optional().describe('Whether the transaction is reconciled.'),
    url: z.string().optional().describe('URL link for the transaction.')
});

const OutputSchema = z.object({
    bank_transaction_id: z.string().describe('Unique identifier for the bank transaction'),
    type: z.enum(['SPEND', 'RECEIVE']).describe('Type of bank transaction'),
    contact_id: z.union([z.string(), z.null()]).describe('Contact ID'),
    contact_name: z.union([z.string(), z.null()]).describe('Contact name'),
    bank_account_id: z.union([z.string(), z.null()]).describe('Bank account ID'),
    bank_account_code: z.union([z.string(), z.null()]).describe('Bank account code'),
    date: z.string().describe('Transaction date'),
    reference: z.union([z.string(), z.null()]).describe('Transaction reference'),
    currency_code: z.union([z.string(), z.null()]).describe('Currency code'),
    status: z.string().describe('Transaction status'),
    line_amount_types: z.union([z.string(), z.null()]).describe('Line amount types'),
    sub_total: z.number().describe('Sub total amount'),
    total_tax: z.number().describe('Total tax amount'),
    total: z.number().describe('Total amount'),
    is_reconciled: z.boolean().describe('Whether transaction is reconciled'),
    line_items: z
        .array(
            z.object({
                line_item_id: z.string(),
                description: z.union([z.string(), z.null()]),
                quantity: z.number(),
                unit_amount: z.number(),
                account_code: z.union([z.string(), z.null()]),
                tax_type: z.union([z.string(), z.null()]),
                line_amount: z.number()
            })
        )
        .describe('Array of line items'),
    created_at: z.union([z.string(), z.null()]).describe('Creation timestamp'),
    updated_at: z.union([z.string(), z.null()]).describe('Update timestamp')
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
            Contact: input.contact.contact_id ? { ContactID: input.contact.contact_id } : { Name: input.contact.name },
            BankAccount: input.bank_account.account_id ? { AccountID: input.bank_account.account_id } : { Code: input.bank_account.code },
            LineItems: input.line_items.map((item) => ({
                Description: item.description,
                Quantity: item.quantity ?? 1,
                UnitAmount: item.unit_amount,
                AccountCode: item.account_code,
                ...(item.tax_type && { TaxType: item.tax_type }),
                ...(item.item_code && { ItemCode: item.item_code })
            })),
            ...(input.date && { Date: input.date }),
            ...(input.reference && { Reference: input.reference }),
            ...(input.currency_code && { CurrencyCode: input.currency_code }),
            ...(input.status && { Status: input.status }),
            ...(input.is_reconciled !== undefined && { IsReconciled: input.is_reconciled }),
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
            line_item_id: typeof item['LineItemID'] === 'string' ? item['LineItemID'] : '',
            description: typeof item['Description'] === 'string' ? item['Description'] : null,
            quantity: typeof item['Quantity'] === 'number' ? item['Quantity'] : 0,
            unit_amount: typeof item['UnitAmount'] === 'number' ? item['UnitAmount'] : 0,
            account_code: typeof item['AccountCode'] === 'string' ? item['AccountCode'] : null,
            tax_type: typeof item['TaxType'] === 'string' ? item['TaxType'] : null,
            line_amount: typeof item['LineAmount'] === 'number' ? item['LineAmount'] : 0
        }));

        return {
            bank_transaction_id: typeof transaction.BankTransactionID === 'string' ? transaction.BankTransactionID : '',
            type: transaction.Type === 'SPEND' || transaction.Type === 'RECEIVE' ? transaction.Type : 'SPEND',
            contact_id: transaction.Contact && typeof transaction.Contact.ContactID === 'string' ? transaction.Contact.ContactID : null,
            contact_name: transaction.Contact && typeof transaction.Contact.Name === 'string' ? transaction.Contact.Name : null,
            bank_account_id: transaction.BankAccount && typeof transaction.BankAccount.AccountID === 'string' ? transaction.BankAccount.AccountID : null,
            bank_account_code: transaction.BankAccount && typeof transaction.BankAccount.Code === 'string' ? transaction.BankAccount.Code : null,
            date: typeof transaction.Date === 'string' ? transaction.Date : '',
            reference: typeof transaction.Reference === 'string' ? transaction.Reference : null,
            currency_code: typeof transaction.CurrencyCode === 'string' ? transaction.CurrencyCode : null,
            status: typeof transaction.Status === 'string' ? transaction.Status : 'UNKNOWN',
            line_amount_types: typeof transaction.LineAmountTypes === 'string' ? transaction.LineAmountTypes : null,
            sub_total: typeof transaction.SubTotal === 'number' ? transaction.SubTotal : 0,
            total_tax: typeof transaction.TotalTax === 'number' ? transaction.TotalTax : 0,
            total: typeof transaction.Total === 'number' ? transaction.Total : 0,
            is_reconciled: typeof transaction.IsReconciled === 'boolean' ? transaction.IsReconciled : false,
            line_items: parsedLineItems,
            created_at: typeof transaction.CreatedDateUTC === 'string' ? transaction.CreatedDateUTC : null,
            updated_at: typeof transaction.UpdatedDateUTC === 'string' ? transaction.UpdatedDateUTC : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
