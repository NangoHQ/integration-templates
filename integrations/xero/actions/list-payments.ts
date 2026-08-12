import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        where: z.string().optional().describe('Xero filter expression (e.g., \'Status=="AUTHORISED"\').'),
        order: z.string().optional().describe("Order by clause (e.g., 'Date DESC')."),
        modified_since: z
            .string()
            .optional()
            .describe('RFC3339/ISO8601 timestamp for the If-Modified-Since header. Only records changed since this time are returned.')
    })
    .describe('Input for listing Xero payments with optional filters and pagination.');

const AccountSchema = z.object({
    AccountID: z.string().optional().describe('Unique identifier of the account.'),
    Code: z.string().optional().describe('Chart of accounts code.')
});

const InvoiceContactSchema = z.object({
    ContactID: z.string().optional().describe('Unique identifier of the contact.'),
    Name: z.string().optional().describe('Name of the contact.')
});

const InvoiceSchema = z.object({
    Type: z.string().optional().describe('Type of the invoice (e.g., ACCREC, ACCPAY).'),
    InvoiceID: z.string().optional().describe('Unique identifier of the invoice.'),
    InvoiceNumber: z.string().optional().describe('Invoice number.'),
    Contact: InvoiceContactSchema.optional().describe('Contact associated with the invoice.'),
    CurrencyCode: z.string().optional().describe('Currency code of the invoice.')
});

const PaymentSchema = z.object({
    PaymentID: z.string().describe('Unique identifier of the payment.'),
    Date: z.string().optional().describe('Date the payment was made (Xero date format).'),
    BankAmount: z.number().optional().describe('Amount of the payment in the bank account currency.'),
    Amount: z.number().optional().describe('Amount of the payment in the invoice currency.'),
    Reference: z.string().optional().describe('Reference text for the payment.'),
    CurrencyRate: z.number().optional().describe('Exchange rate used for the payment.'),
    PaymentType: z.string().optional().describe('Type of payment (e.g., ACCRECPAYMENT, ACCPAYPAYMENT).'),
    Status: z.string().optional().describe('Status of the payment (e.g., AUTHORISED, DELETED).'),
    UpdatedDateUTC: z.string().optional().describe('Timestamp when the payment was last updated.'),
    HasAccount: z.boolean().optional().describe('Whether an account is associated with the payment.'),
    IsReconciled: z.boolean().optional().describe('Whether the payment has been reconciled.'),
    Account: AccountSchema.optional().describe('Account used to post the payment.'),
    Invoice: InvoiceSchema.optional().describe('Invoice or credit note associated with the payment.'),
    HasValidationErrors: z.boolean().optional().describe('Whether the payment has validation errors.')
});

const PaginationSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    pageCount: z.number(),
    itemCount: z.number()
});

const ProviderResponseSchema = z.object({
    Id: z.string(),
    Status: z.string(),
    ProviderName: z.string(),
    DateTimeUTC: z.string(),
    pagination: PaginationSchema.optional(),
    Payments: z.array(PaymentSchema)
});

const OutputSchema = z
    .object({
        payments: z.array(PaymentSchema).describe('Array of payment records matching the query.'),
        next_page: z.string().optional().describe('The next page number to request, if more pages are available.')
    })
    .describe('Output containing the list of payments and pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a list of existing payment records from Xero.
 * @pitfalls: The API returns both active and deleted payments by default; use the `where` input (e.g., 'Status=="AUTHORISED"') to exclude deleted records.
 */
const action = createAction({
    description: 'List payments with filters and pagination.',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.payments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionData = z
            .object({
                connection_config: z.record(z.string(), z.unknown()).nullable().optional(),
                metadata: z.record(z.string(), z.unknown()).nullable().optional()
            })
            .parse(connection);

        let tenantId: string | undefined;
        if (
            connectionData.connection_config &&
            typeof connectionData.connection_config['tenant_id'] === 'string' &&
            connectionData.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connectionData.connection_config['tenant_id'];
        } else if (connectionData.metadata && typeof connectionData.metadata['tenantId'] === 'string' && connectionData.metadata['tenantId'].length > 0) {
            tenantId = connectionData.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/tenants/
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const rawConnections = connectionsResponse.data;
            if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }
            if (rawConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }
            const first = z.object({ tenantId: z.string() }).safeParse(rawConnections[0]);
            if (first.success && first.data.tenantId.length > 0) {
                tenantId = first.data.tenantId;
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
        if (input.modified_since !== undefined && input.modified_since.length > 0) {
            headers['If-Modified-Since'] = input.modified_since;
        }

        const params: Record<string, string> = {};
        if (input.cursor !== undefined && input.cursor.length > 0) {
            params['page'] = input.cursor;
        }
        if (input.where !== undefined && input.where.length > 0) {
            params['where'] = input.where;
        }
        if (input.order !== undefined && input.order.length > 0) {
            params['order'] = input.order;
        }

        // https://developer.xero.com/documentation/api/accounting/payments
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Payments',
            params,
            headers,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        let nextPage: string | undefined;
        if (providerResponse.pagination) {
            const currentPage = providerResponse.pagination.page;
            const pageCount = providerResponse.pagination.pageCount;
            if (currentPage < pageCount) {
                nextPage = String(currentPage + 1);
            }
        }

        return {
            payments: providerResponse.Payments,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
