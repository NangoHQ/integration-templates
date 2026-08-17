import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        page: z.number().optional().describe('Page number for pagination (1-based). Omit for the first page.'),
        where: z.string().optional().describe('Xero where clause filter expression. Example: "Type==\\"SPEND\\" AND Status==\\"AUTHORISED\\""'),
        order: z.string().optional().describe('Order by clause. Example: "Date DESC"'),
        ifModifiedSince: z.string().optional().describe('ISO 8601 timestamp. Only records modified since this time will be returned.')
    })
    .describe('Input for listing Xero bank transactions');

const ContactSchema = z
    .object({
        ContactID: z.string().optional().describe('Unique identifier for the contact.'),
        Name: z.string().optional().describe('Name of the contact.')
    })
    .passthrough();

const BankAccountSchema = z
    .object({
        AccountID: z.string().optional().describe('Unique identifier for the bank account.'),
        Code: z.string().optional().describe('Account code.'),
        Name: z.string().optional().describe('Name of the bank account.')
    })
    .passthrough();

const LineItemSchema = z
    .object({
        Description: z.string().nullish().describe('Description of the line item.'),
        Quantity: z.number().nullish().describe('Quantity of the line item.'),
        UnitAmount: z.number().nullish().describe('Unit price of the line item.'),
        AccountCode: z.string().nullish().describe('Account code for the line item.'),
        TaxType: z.string().nullish().describe('Tax type applied to the line item.'),
        LineAmount: z.number().nullish().describe('Total amount for the line item.')
    })
    .passthrough();

const BankTransactionSchema = z
    .object({
        BankTransactionID: z.string().describe('Unique identifier for the bank transaction.'),
        Contact: ContactSchema.optional().describe('Contact associated with the transaction.'),
        Date: z.string().optional().describe('Transaction date in YYYY-MM-DD format.'),
        Status: z.string().optional().describe('Transaction status, e.g. AUTHORISED or DELETED.'),
        LineAmountTypes: z.string().optional().describe('Line amount type, e.g. Inclusive, Exclusive, NoTax.'),
        SubTotal: z.number().optional().describe('Subtotal amount before tax.'),
        TotalTax: z.number().optional().describe('Total tax amount.'),
        Total: z.number().optional().describe('Total amount including tax.'),
        UpdatedDateUTC: z.string().optional().describe('Last modified timestamp in UTC.'),
        CurrencyCode: z.string().optional().describe('Currency code, e.g. USD.'),
        Type: z.string().optional().describe('Transaction type, e.g. SPEND, RECEIVE, RECEIVE-PREPAYMENT, RECEIVE-OVERPAYMENT, TRANSFER.'),
        Reference: z.string().nullish().describe('Reference text for the transaction.'),
        IsReconciled: z.boolean().optional().describe('Whether the transaction is reconciled.'),
        BankAccount: BankAccountSchema.optional().describe('Bank account associated with the transaction.'),
        LineItems: z.array(LineItemSchema).optional().describe('Line items for the transaction.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        bankTransactions: z.array(BankTransactionSchema).describe('List of bank transactions returned by Xero.'),
        nextPage: z.number().optional().describe('Next page number if more results may be available.')
    })
    .describe('Output for listing Xero bank transactions');

/**
 * @tags: [read]
 * @tagReason: Reads bank transactions from the Xero Accounting API.
 * @pitfalls: The list includes soft-deleted transactions (Status: DELETED) by default; use the where parameter to exclude them if needed. Xero does not reliably include a pagination object in the response (observed absent when no page param is sent), so nextPage is derived from the result count reaching 100 rather than from provider pagination metadata.
 */
const action = createAction({
    description: 'List bank transactions with filters and pagination',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.banktransactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const ConnectionConfigSchema = z.object({
            tenant_id: z.string().optional()
        });
        const connectionConfig = ConnectionConfigSchema.parse(connection.connection_config || {});
        let tenantId = connectionConfig.tenant_id && connectionConfig.tenant_id.length > 0 ? connectionConfig.tenant_id : undefined;

        if (!tenantId) {
            const MetadataSchema = z.object({
                tenantId: z.string().optional()
            });
            const metadata = MetadataSchema.parse(connection.metadata || {});
            tenantId = metadata.tenantId && metadata.tenantId.length > 0 ? metadata.tenantId : undefined;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsArray = z.array(z.record(z.string(), z.unknown())).parse(connectionsResponse.data);

            if (connectionsArray.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsArray.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const TenantSchema = z.object({
                tenantId: z.string().optional()
            });
            const firstTenant = TenantSchema.parse(connectionsArray[0]);
            if (firstTenant.tenantId && firstTenant.tenantId.length > 0) {
                tenantId = firstTenant.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.ifModifiedSince !== undefined && input.ifModifiedSince.length > 0) {
            headers['If-Modified-Since'] = input.ifModifiedSince;
        }

        const params: Record<string, string> = {};
        if (input.page !== undefined) {
            params['page'] = String(input.page);
        }
        if (input.where !== undefined) {
            params['where'] = input.where;
        }
        if (input.order !== undefined) {
            params['order'] = input.order;
        }

        // https://developer.xero.com/documentation/api/accounting/overview
        const response = await nango.get({
            endpoint: 'api.xro/2.0/BankTransactions',
            headers,
            params,
            retries: 3
        });

        const ResponseSchema = z.object({
            BankTransactions: z.array(z.record(z.string(), z.unknown())).optional(),
            Status: z.string().optional()
        });
        const parsedResponse = ResponseSchema.parse(response.data);
        const bankTransactions = parsedResponse.BankTransactions || [];

        const mapped = bankTransactions.map((item) => BankTransactionSchema.parse(item));

        const currentPage = input.page ?? 1;
        const hasMore = bankTransactions.length === 100;
        const nextPage = hasMore ? currentPage + 1 : undefined;

        return {
            bankTransactions: mapped,
            ...(nextPage !== undefined && { nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
