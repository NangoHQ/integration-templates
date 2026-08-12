import { createAction } from 'nango';
import * as z from 'zod';

const inputSchema = z
    .object({
        bankTransactionId: z.string().describe('The unique identifier of the bank transaction to retrieve')
    })
    .describe('Input for retrieving a Xero bank transaction');

const contactSchema = z.object({
    ContactID: z.string().describe('The unique identifier of the contact'),
    Name: z.string().describe('The name of the contact')
});

const bankAccountSchema = z.object({
    AccountID: z.string().describe('The unique identifier of the bank account'),
    Code: z.string().describe('The account code of the bank account'),
    Name: z.string().describe('The name of the bank account')
});

const lineItemSchema = z.object({
    Description: z.string().describe('The description of the line item'),
    Quantity: z.number().describe('The quantity of the line item'),
    UnitAmount: z.number().describe('The unit amount of the line item'),
    AccountCode: z.string().describe('The account code for the line item'),
    ItemCode: z.string().nullable().optional().describe('The item code of the line item'),
    TaxType: z.string().nullable().optional().describe('The tax type for the line item'),
    LineAmount: z.number().describe('The total amount for the line item'),
    Tracking: z.array(z.unknown()).optional().describe('Tracking categories for the line item')
});

const outputSchema = z
    .object({
        BankTransactionID: z.string().describe('The unique identifier of the bank transaction'),
        Type: z.string().describe('The type of bank transaction, e.g. SPEND or RECEIVE'),
        Contact: contactSchema.describe('The contact associated with this bank transaction'),
        Date: z.string().describe('The date of the bank transaction'),
        Status: z.string().describe('The status of the bank transaction, e.g. AUTHORISED or DELETED'),
        LineAmountTypes: z.string().describe('The line amount type, e.g. Exclusive, Inclusive, or NoTax'),
        SubTotal: z.number().describe('The subtotal of the bank transaction excluding taxes'),
        TotalTax: z.number().describe('The total tax on the bank transaction'),
        Total: z.number().describe('The total of the bank transaction including taxes'),
        Reference: z.string().nullable().optional().describe('A reference for the bank transaction'),
        IsReconciled: z.boolean().describe('Whether the bank transaction has been reconciled'),
        BankAccount: bankAccountSchema.describe('The bank account associated with this transaction'),
        UpdatedDateUTC: z.string().describe('The UTC date and time when the bank transaction was last updated'),
        Url: z.string().nullable().optional().describe('A URL link to the source document'),
        LineItems: z.array(lineItemSchema).describe('The line items included in the bank transaction')
    })
    .describe('A Xero bank transaction');

const bankTransactionsResponseSchema = z.object({
    BankTransactions: z.array(outputSchema)
});

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing bank transaction by ID from the Xero Accounting API.
 * @pitfalls: Deleted bank transactions remain gettable with Status "DELETED", and Date/UpdatedDateUTC values are returned in Xero's /Date(timestamp+offset)/ format rather than ISO 8601.
 */
const action = createAction({
    description: 'Retrieve a bank transaction by BankTransactionID',
    version: '1.0.2',
    input: inputSchema,
    output: outputSchema,
    exec: async (nango, input) => {
        const tenantId = await resolveTenantId(nango);
        const endpoint = `api.xro/2.0/BankTransactions/${encodeURIComponent(input.bankTransactionId)}`;

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.get({
            endpoint,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 10
        });

        const parsed = bankTransactionsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError('Invalid response from Xero API when retrieving bank transaction');
        }

        const transactions = parsed.data.BankTransactions;
        if (transactions.length === 0) {
            throw new nango.ActionError('Bank transaction not found');
        }

        const transaction = transactions[0];
        if (transaction === undefined) {
            throw new nango.ActionError('Bank transaction not found');
        }

        return transaction;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;

async function resolveTenantId(nango: NangoActionLocal): Promise<string> {
    const connection = await nango.getConnection();

    if (
        typeof connection.connection_config === 'object' &&
        connection.connection_config !== null &&
        'tenant_id' in connection.connection_config &&
        typeof connection.connection_config['tenant_id'] === 'string' &&
        connection.connection_config['tenant_id'].length > 0
    ) {
        return connection.connection_config['tenant_id'];
    }

    if (
        typeof connection.metadata === 'object' &&
        connection.metadata !== null &&
        'tenantId' in connection.metadata &&
        typeof connection.metadata['tenantId'] === 'string' &&
        connection.metadata['tenantId'].length > 0
    ) {
        return connection.metadata['tenantId'];
    }

    // https://developer.xero.com/documentation/api/accounting/overview
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    if (!Array.isArray(connectionsResponse.data) || connectionsResponse.data.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }

    if (connectionsResponse.data.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnection = connectionsResponse.data[0];
    if (
        typeof firstConnection === 'object' &&
        firstConnection !== null &&
        'tenantId' in firstConnection &&
        typeof firstConnection['tenantId'] === 'string' &&
        firstConnection['tenantId'].length > 0
    ) {
        return firstConnection['tenantId'];
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve xero-tenant-id.'
    });
}
