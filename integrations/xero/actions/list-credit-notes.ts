import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Up to 100 credit notes per page.'),
    where: z.string().optional().describe('Filter by any element. Example: Status=="AUTHORISED"'),
    order: z.string().optional().describe('Order by any element. Example: CreditNoteNumber ASC'),
    modified_since: z
        .string()
        .optional()
        .describe('Only records created or modified since this timestamp (ISO 8601) will be returned. Maps to If-Modified-Since header.')
});

const PaginationSchema = z.object({
    page: z.number().optional(),
    pageSize: z.number().optional(),
    pageCount: z.number().optional(),
    itemCount: z.number().optional()
});

const CreditNoteSchema = z
    .object({
        Type: z.string().optional(),
        Contact: z.record(z.string(), z.unknown()).optional(),
        Date: z.string().optional(),
        DueDate: z.string().optional(),
        Status: z.string().optional(),
        LineAmountTypes: z.string().optional(),
        LineItems: z.array(z.record(z.string(), z.unknown())).optional(),
        SubTotal: z.number().optional(),
        TotalTax: z.number().optional(),
        Total: z.number().optional(),
        CISDeduction: z.number().optional(),
        CISRate: z.number().optional(),
        UpdatedDateUTC: z.string().optional(),
        CurrencyCode: z.string().optional(),
        FullyPaidOnDate: z.string().optional(),
        CreditNoteID: z.string().optional(),
        CreditNoteNumber: z.string().optional(),
        Reference: z.string().optional(),
        SentToContact: z.boolean().optional(),
        CurrencyRate: z.number().optional(),
        RemainingCredit: z.number().optional(),
        Allocations: z.array(z.record(z.string(), z.unknown())).optional(),
        AppliedAmount: z.number().optional(),
        Payments: z.array(z.record(z.string(), z.unknown())).optional(),
        BrandingThemeID: z.string().optional(),
        StatusAttributeString: z.string().optional(),
        HasAttachments: z.boolean().optional(),
        HasErrors: z.boolean().optional(),
        ValidationErrors: z.array(z.record(z.string(), z.unknown())).optional(),
        Warnings: z.array(z.record(z.string(), z.unknown())).optional(),
        InvoiceAddresses: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    CreditNotes: z.array(CreditNoteSchema),
    pagination: PaginationSchema.optional()
});

const action = createAction({
    description: 'List credit notes with filters and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-credit-notes',
        group: 'Credit Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions', 'accounting.transactions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const configVal = connection.connection_config['tenant_id'];
            if (typeof configVal === 'string') {
                tenantId = configVal;
            }
        }

        if (!tenantId) {
            if (connection.metadata && typeof connection.metadata === 'object') {
                const metaVal = connection.metadata['tenantId'];
                if (typeof metaVal === 'string') {
                    tenantId = metaVal;
                }
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (Array.isArray(connectionsData)) {
                if (connectionsData.length === 1) {
                    const first = connectionsData[0];
                    if (first && typeof first === 'object' && 'tenantId' in first) {
                        const tenantIdVal = first['tenantId'];
                        if (typeof tenantIdVal === 'string') {
                            tenantId = tenantIdVal;
                        }
                    }
                } else if (connectionsData.length > 1) {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Could not resolve xero-tenant-id. Set tenant_id in connection_config or use get-tenants action.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.modified_since !== undefined && input.modified_since.length > 0) {
            headers['If-Modified-Since'] = input.modified_since;
        }

        const params: Record<string, string | number> = {};
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.where !== undefined) {
            params['where'] = input.where;
        }
        if (input.order !== undefined) {
            params['order'] = input.order;
        }

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/creditnotes
            endpoint: 'api.xro/2.0/CreditNotes',
            headers,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Xero CreditNotes API'
            });
        }

        const rawCreditNotes = responseData['CreditNotes'];
        const rawPagination = responseData['pagination'];

        const creditNotes = Array.isArray(rawCreditNotes) ? rawCreditNotes : [];
        const parsedNotes = creditNotes.map((note) => CreditNoteSchema.parse(note));

        let pagination: z.infer<typeof PaginationSchema> | undefined;
        if (rawPagination && typeof rawPagination === 'object') {
            pagination = PaginationSchema.parse(rawPagination);
        }

        return {
            CreditNotes: parsedNotes,
            ...(pagination !== undefined && { pagination })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
