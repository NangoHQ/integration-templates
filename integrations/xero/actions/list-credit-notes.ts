import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Example: 1'),
    where: z.string().optional().describe('Filter condition using Xero where clause. Example: Type=="ACCRECCREDIT"'),
    order: z.string().optional().describe('Order by clause. Example: Date DESC'),
    ifModifiedSince: z.string().optional().describe('Only return records modified after this date (ISO 8601 format). Example: 2024-01-01T00:00:00Z')
});

const CreditNoteSchema = z.object({
    CreditNoteID: z.string(),
    CreditNoteNumber: z.string().optional(),
    ID: z.string().optional(),
    Type: z.string().optional(),
    Reference: z.string().nullable().optional(),
    Status: z.string().optional(),
    SentToContact: z.boolean().optional(),
    Date: z.string().optional(),
    DueDate: z.string().nullable().optional(),
    ExpectedPaymentDate: z.string().nullable().optional(),
    PlannedPaymentDate: z.string().nullable().optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().nullable().optional(),
    RemainingCredit: z.number().optional(),
    Allocations: z.array(z.object({}).passthrough()).optional(),
    Payments: z.array(z.object({}).passthrough()).optional(),
    BrandingThemeID: z.string().nullable().optional(),
    UpdatedDateUTC: z.string().optional(),
    CreditNoteURL: z.string().nullable().optional(),
    RepeatingInvoiceID: z.string().nullable().optional(),
    HasAttachments: z.boolean().optional(),
    Contact: z.object({}).passthrough().optional(),
    LineItems: z.array(z.object({}).passthrough()).optional(),
    History: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z.object({
    creditNotes: z.array(CreditNoteSchema),
    pagination: z.object({
        page: z.number(),
        pageSize: z.number(),
        totalPages: z.number().nullable(),
        totalCount: z.number().nullable()
    })
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
    scopes: ['accounting.transactions.read', 'accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId = connection.connection_config?.['tenant_id'];
        if (!tenantId && connection.metadata?.['tenantId']) {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            const connectionsResponse = await nango.get({
                // https://developer.xero.com/documentation/api/accounting/overview#connections
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (connectionsData && Array.isArray(connectionsData) && connectionsData.length > 0) {
                if (connectionsData.length === 1) {
                    tenantId = connectionsData[0]['tenantId'];
                } else {
                    throw new nango.ActionError({
                        type: 'multiple_tenants',
                        message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                    });
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant_id',
                message: 'Could not resolve tenant_id. Please set tenant_id in connection_config or metadata.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input['ifModifiedSince']) {
            headers['If-Modified-Since'] = input['ifModifiedSince'];
        }

        const params: Record<string, string | number> = {};
        if (input['page']) {
            params['page'] = input['page'];
        }
        if (input['where']) {
            params['where'] = input['where'];
        }
        if (input['order']) {
            params['order'] = input['order'];
        }

        const response = await nango.get({
            // https://developer.xero.com/documentation/api/accounting/creditnotes
            endpoint: 'api.xro/2.0/CreditNotes',
            headers,
            params,
            retries: 3
        });

        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object') {
            return {
                creditNotes: [],
                pagination: {
                    page: input['page'] || 1,
                    pageSize: 100,
                    totalPages: null,
                    totalCount: null
                }
            };
        }

        const rawCreditNotes = responseData['CreditNotes'];
        const paginationData = responseData['Pagination'];

        let creditNotesArray: unknown[] = [];
        if (Array.isArray(rawCreditNotes)) {
            creditNotesArray = rawCreditNotes;
        }

        const validCreditNotes = creditNotesArray.filter((note): note is Record<string, unknown> => {
            return note !== null && typeof note === 'object';
        });

        const mappedCreditNotes = validCreditNotes
            .map((note) => {
                const creditNoteID = note['CreditNoteID'];
                if (typeof creditNoteID !== 'string') {
                    return null;
                }
                return {
                    CreditNoteID: creditNoteID,
                    CreditNoteNumber: typeof note['CreditNoteNumber'] === 'string' ? note['CreditNoteNumber'] : undefined,
                    ID: typeof note['ID'] === 'string' ? note['ID'] : undefined,
                    Type: typeof note['Type'] === 'string' ? note['Type'] : undefined,
                    Reference: note['Reference'] === null ? null : typeof note['Reference'] === 'string' ? note['Reference'] : undefined,
                    Status: typeof note['Status'] === 'string' ? note['Status'] : undefined,
                    SentToContact: typeof note['SentToContact'] === 'boolean' ? note['SentToContact'] : undefined,
                    Date: typeof note['Date'] === 'string' ? note['Date'] : undefined,
                    DueDate: note['DueDate'] === null ? null : typeof note['DueDate'] === 'string' ? note['DueDate'] : undefined,
                    ExpectedPaymentDate:
                        note['ExpectedPaymentDate'] === null ? null : typeof note['ExpectedPaymentDate'] === 'string' ? note['ExpectedPaymentDate'] : undefined,
                    PlannedPaymentDate:
                        note['PlannedPaymentDate'] === null ? null : typeof note['PlannedPaymentDate'] === 'string' ? note['PlannedPaymentDate'] : undefined,
                    SubTotal: typeof note['SubTotal'] === 'number' ? note['SubTotal'] : undefined,
                    TotalTax: typeof note['TotalTax'] === 'number' ? note['TotalTax'] : undefined,
                    Total: typeof note['Total'] === 'number' ? note['Total'] : undefined,
                    CurrencyCode: typeof note['CurrencyCode'] === 'string' ? note['CurrencyCode'] : undefined,
                    CurrencyRate: note['CurrencyRate'] === null ? null : typeof note['CurrencyRate'] === 'number' ? note['CurrencyRate'] : undefined,
                    RemainingCredit: typeof note['RemainingCredit'] === 'number' ? note['RemainingCredit'] : undefined,
                    Allocations: Array.isArray(note['Allocations']) ? note['Allocations'] : undefined,
                    Payments: Array.isArray(note['Payments']) ? note['Payments'] : undefined,
                    BrandingThemeID:
                        note['BrandingThemeID'] === null ? null : typeof note['BrandingThemeID'] === 'string' ? note['BrandingThemeID'] : undefined,
                    UpdatedDateUTC: typeof note['UpdatedDateUTC'] === 'string' ? note['UpdatedDateUTC'] : undefined,
                    CreditNoteURL: note['CreditNoteURL'] === null ? null : typeof note['CreditNoteURL'] === 'string' ? note['CreditNoteURL'] : undefined,
                    RepeatingInvoiceID:
                        note['RepeatingInvoiceID'] === null ? null : typeof note['RepeatingInvoiceID'] === 'string' ? note['RepeatingInvoiceID'] : undefined,
                    HasAttachments: typeof note['HasAttachments'] === 'boolean' ? note['HasAttachments'] : undefined,
                    Contact:
                        typeof note['Contact'] === 'object' && note['Contact'] !== null && !Array.isArray(note['Contact'])
                            ? Object.fromEntries(Object.entries(note['Contact']))
                            : undefined,
                    LineItems: Array.isArray(note['LineItems']) ? note['LineItems'] : undefined,
                    History: Array.isArray(note['History']) ? note['History'] : undefined
                };
            })
            .filter((note) => note !== null);

        let pageNum = input['page'] || 1;
        let pageSize = 100;
        let totalPages: number | null = null;
        let totalCount: number | null = null;

        if (paginationData && typeof paginationData === 'object' && !Array.isArray(paginationData)) {
            const p: Record<string, unknown> = Object.fromEntries(Object.entries(paginationData));
            if (typeof p['Page'] === 'number') {
                pageNum = p['Page'];
            }
            if (typeof p['PageSize'] === 'number') {
                pageSize = p['PageSize'];
            }
            if (typeof p['PageCount'] === 'number') {
                totalPages = p['PageCount'];
            }
            if (typeof p['ItemCount'] === 'number') {
                totalCount = p['ItemCount'];
            }
        }

        return {
            creditNotes: mappedCreditNotes,
            pagination: {
                page: pageNum,
                pageSize: pageSize,
                totalPages: totalPages,
                totalCount: totalCount
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
