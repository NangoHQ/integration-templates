import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Up to 100 payments per page.'),
    where: z.string().optional().describe('Filter expression e.g. Status=="AUTHORISED"'),
    order: z.string().optional().describe('Order by expression e.g. Date ASC'),
    if_modified_since: z.string().optional().describe('UTC timestamp in yyyy-mm-ddThh:mm:ss format for the If-Modified-Since header')
});

const PaginationSchema = z.object({
    page: z.number().optional(),
    pageSize: z.number().optional(),
    pageCount: z.number().optional(),
    itemCount: z.number().optional()
});

const PaymentSchema = z
    .object({
        PaymentID: z.string().optional(),
        Date: z.string().optional(),
        Amount: z.number().optional(),
        BankAmount: z.number().optional(),
        Reference: z.string().optional(),
        CurrencyRate: z.number().optional(),
        PaymentType: z.string().optional(),
        Status: z.string().optional(),
        UpdatedDateUTC: z.string().optional(),
        HasAccount: z.boolean().optional(),
        IsReconciled: z.boolean().optional(),
        HasValidationErrors: z.boolean().optional(),
        Invoice: z.object({}).passthrough().optional(),
        CreditNote: z.object({}).passthrough().optional(),
        Prepayment: z.object({}).passthrough().optional(),
        Overpayment: z.object({}).passthrough().optional(),
        Account: z.object({}).passthrough().optional(),
        BatchPayment: z.object({}).passthrough().optional(),
        BatchPaymentID: z.string().optional(),
        BankAccountNumber: z.string().optional(),
        Particulars: z.string().optional(),
        Details: z.string().optional(),
        Code: z.string().optional(),
        InvoiceNumber: z.string().optional(),
        CreditNoteNumber: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    Payments: z.array(PaymentSchema).optional(),
    pagination: PaginationSchema.optional(),
    Id: z.string().optional(),
    Status: z.string().optional(),
    ProviderName: z.string().optional(),
    DateTimeUTC: z.string().optional(),
    Warnings: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z.object({
    Payments: z.array(PaymentSchema),
    Pagination: PaginationSchema.optional(),
    NextPage: z.number().optional()
});

const action = createAction({
    description: 'List payments with filters and pagination',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-payments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let tenantId: string | undefined;

        if (connection && typeof connection === 'object') {
            const connConfig = 'connection_config' in connection ? connection.connection_config : undefined;
            if (connConfig && typeof connConfig === 'object' && 'tenant_id' in connConfig && typeof connConfig['tenant_id'] === 'string') {
                tenantId = connConfig['tenant_id'];
            }

            if (!tenantId) {
                const metadata = 'metadata' in connection ? connection.metadata : undefined;
                if (metadata && typeof metadata === 'object' && 'tenantId' in metadata && typeof metadata['tenantId'] === 'string') {
                    tenantId = metadata['tenantId'];
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResponse = await nango.get({
                endpoint: '/connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (!connectionsData || typeof connectionsData !== 'object') {
                throw new nango.ActionError({
                    type: 'tenant_resolution_failed',
                    message: 'Failed to resolve xero-tenant-id. The connections response was invalid.'
                });
            }

            const data = 'data' in connectionsData ? connectionsData.data : undefined;
            if (!Array.isArray(data)) {
                throw new nango.ActionError({
                    type: 'tenant_resolution_failed',
                    message: 'Failed to resolve xero-tenant-id. The connections response did not contain a data array.'
                });
            }

            if (data.length === 0) {
                throw new nango.ActionError({
                    type: 'tenant_resolution_failed',
                    message: 'Failed to resolve xero-tenant-id. No tenants found for this connection.'
                });
            }

            if (data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = data[0];
            if (
                !firstConnection ||
                typeof firstConnection !== 'object' ||
                !('tenantId' in firstConnection) ||
                typeof firstConnection['tenantId'] !== 'string'
            ) {
                throw new nango.ActionError({
                    type: 'tenant_resolution_failed',
                    message: 'Failed to resolve xero-tenant-id. The connections response did not contain a valid tenantId.'
                });
            }

            tenantId = firstConnection['tenantId'];
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.if_modified_since !== undefined && input.if_modified_since.length > 0) {
            headers['If-Modified-Since'] = input.if_modified_since;
        }

        const params: Record<string, string | number> = {};
        if (input.page !== undefined) {
            params['page'] = input.page;
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
            headers,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const payments = parsed.Payments ?? [];

        let nextPage: number | undefined;
        if (parsed.pagination && typeof parsed.pagination.page === 'number' && typeof parsed.pagination.pageCount === 'number') {
            if (parsed.pagination.page < parsed.pagination.pageCount) {
                nextPage = parsed.pagination.page + 1;
            }
        }

        return {
            Payments: payments,
            ...(parsed.pagination !== undefined && { Pagination: parsed.pagination }),
            ...(nextPage !== undefined && { NextPage: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
