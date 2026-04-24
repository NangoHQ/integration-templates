import { z } from 'zod';
import { createAction } from 'nango';

// Docs: https://developer.xero.com/documentation/api/accounting/invoices

const InputSchema = z.object({
    page: z.number().int().min(1).optional().describe('Page number for pagination. Example: 1'),
    where: z.string().optional().describe('Filter expression. Example: Type=="ACCREC"'),
    summaryOnly: z.boolean().optional().describe('Return a summary version of the invoice data.'),
    modifiedSince: z.string().optional().describe('Return invoices modified since this date (ISO 8601 format). Example: 2024-01-01T00:00:00')
});

const InvoiceSchema = z.object({
    InvoiceID: z.string(),
    InvoiceNumber: z.string().optional(),
    Type: z.string().optional(),
    Reference: z.string().nullable().optional(),
    Prepayments: z.array(z.unknown()).optional(),
    Overpayments: z.array(z.unknown()).optional(),
    AmountDue: z.number().optional(),
    AmountPaid: z.number().optional(),
    AmountCredited: z.number().optional(),
    CurrencyRate: z.number().optional(),
    IsDiscounted: z.boolean().optional(),
    HasAttachments: z.boolean().optional(),
    InvoiceStatus: z.string().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    TotalDiscount: z.number().optional(),
    InvoiceItems: z.array(z.unknown()).optional(),
    UpdatedDateUTC: z.string().optional(),
    CurrencyCode: z.string().optional(),
    FullyPaidOnDate: z.string().nullable().optional(),
    Date: z.string().optional(),
    DueDate: z.string().nullable().optional(),
    StatusAttributeString: z.string().optional(),
    ValidationErrors: z.array(z.unknown()).optional(),
    Warnings: z.array(z.unknown()).optional(),
    Contact: z.unknown().optional(),
    LineItems: z.array(z.unknown()).optional(),
    Payments: z.array(z.unknown()).optional(),
    CreditNotes: z.array(z.unknown()).optional(),
    BrandingThemeID: z.string().optional(),
    Url: z.string().optional(),
    SentToContact: z.boolean().optional(),
    ExpectedPaymentDate: z.string().nullable().optional(),
    PlannedPaymentDate: z.string().nullable().optional(),
    CISDeduction: z.number().optional(),
    CISRate: z.number().optional(),
    RCMApplicable: z.boolean().optional(),
    LineAmountTypes: z.string().optional(),
    PaymentTerms: z.unknown().optional(),
    LastPaymentDate: z.string().nullable().optional()
});

const OutputSchema = z.object({
    invoices: z.array(InvoiceSchema),
    nextPage: z.union([z.number(), z.null()])
});

const action = createAction({
    description: 'List invoices with filters and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-invoices',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions.read', 'accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        // Resolve tenant ID: connection_config.tenant_id > metadata.tenantId > GET connections
        let tenantId: string | undefined;

        if (connection.connection_config && typeof connection.connection_config === 'object' && !Array.isArray(connection.connection_config)) {
            const config = connection.connection_config;
            if (typeof config['tenant_id'] === 'string') {
                tenantId = config['tenant_id'];
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object' && !Array.isArray(connection.metadata)) {
            const metadata = connection.metadata;
            if (typeof metadata['tenantId'] === 'string') {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // Docs: https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            if (connectionsResponse.data && Array.isArray(connectionsResponse.data) && connectionsResponse.data.length > 0) {
                const connections = connectionsResponse.data;
                if (connections.length > 1) {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
                const firstConnection = connections[0];
                if (firstConnection && typeof firstConnection === 'object' && !Array.isArray(firstConnection)) {
                    const tenantIdValue = firstConnection['tenantId'];
                    if (typeof tenantIdValue === 'string') {
                        tenantId = tenantIdValue;
                    }
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'No tenant ID found. Please configure tenant_id in connection_config or use the get-tenants action.'
            });
        }

        const params: Record<string, string> = {};
        if (input.page !== undefined) {
            params['page'] = String(input.page);
        }
        if (input.where !== undefined && input.where.length > 0) {
            params['where'] = input.where;
        }
        if (input.summaryOnly !== undefined) {
            params['summaryOnly'] = String(input.summaryOnly);
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };
        if (input.modifiedSince !== undefined && input.modifiedSince.length > 0) {
            headers['If-Modified-Since'] = input.modifiedSince;
        }

        // Docs: https://developer.xero.com/documentation/api/accounting/invoices
        const response = await nango.get({
            endpoint: 'api.xro/2.0/Invoices',
            params: params,
            headers: headers,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            return {
                invoices: [],
                nextPage: null
            };
        }

        const responseData = response.data;
        const rawInvoices = 'Invoices' in responseData && Array.isArray(responseData['Invoices']) ? responseData['Invoices'] : [];

        const invoices: z.infer<typeof InvoiceSchema>[] = [];
        for (const rawInvoice of rawInvoices) {
            const parsed = InvoiceSchema.safeParse(rawInvoice);
            if (parsed.success) {
                invoices.push(parsed.data);
            }
        }

        // Determine next page - Xero uses page-based pagination
        // If we received invoices, there might be more pages
        const currentPage = input.page ?? 1;
        const nextPage = invoices.length === 100 ? currentPage + 1 : null;

        return {
            invoices: invoices,
            nextPage: nextPage
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
