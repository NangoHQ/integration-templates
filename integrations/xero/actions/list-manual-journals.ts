import { z } from 'zod';
import { createAction } from 'nango';

const ProviderPaginationSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    pageCount: z.number(),
    itemCount: z.number()
});

const ProviderResponseSchema = z.object({
    ManualJournals: z
        .array(
            z
                .object({
                    ManualJournalID: z.string().optional(),
                    Date: z.string().optional(),
                    Status: z.string().optional(),
                    LineAmountTypes: z.string().optional(),
                    UpdatedDateUTC: z.string().optional(),
                    Narration: z.string().optional(),
                    JournalLines: z
                        .array(
                            z
                                .object({
                                    LineID: z.string().optional(),
                                    Description: z.string().optional(),
                                    AccountCode: z.string().optional(),
                                    AccountID: z.string().optional(),
                                    TaxType: z.string().optional(),
                                    Tracking: z
                                        .array(
                                            z
                                                .object({
                                                    TrackingCategoryID: z.string().optional(),
                                                    Name: z.string().optional(),
                                                    Option: z.string().optional(),
                                                    TrackingOptionID: z.string().optional(),
                                                    Options: z.array(z.unknown()).optional()
                                                })
                                                .passthrough()
                                        )
                                        .optional(),
                                    LineAmount: z.number().optional(),
                                    TaxAmount: z.number().optional(),
                                    IsBlank: z.boolean().optional()
                                })
                                .passthrough()
                        )
                        .optional(),
                    Url: z.string().optional(),
                    HasAttachments: z.boolean().optional(),
                    ManualJournalNumber: z.string().optional(),
                    ShowOnCashBasisReports: z.boolean().optional(),
                    HasErrors: z.boolean().optional(),
                    ValidationErrors: z.array(z.object({ Message: z.string().optional() }).passthrough()).optional()
                })
                .passthrough()
        )
        .optional(),
    pagination: ProviderPaginationSchema.optional()
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        where: z.string().optional().describe('Xero where filter expression. Example: "Status==\\"POSTED\\""'),
        modified_since: z.string().optional().describe('If-Modified-Since header value (ISO 8601). Returns only records changed since this date.')
    })
    .describe('Input for listing manual journals');

const TrackingSchema = z
    .object({
        TrackingCategoryID: z.string().optional().describe('Tracking category ID.'),
        Name: z.string().optional().describe('Tracking category name.'),
        Option: z.string().optional().describe('Selected tracking option.'),
        TrackingOptionID: z.string().optional().describe('Tracking option ID.'),
        Options: z.array(z.unknown()).optional().describe('Available tracking options.')
    })
    .passthrough();

const LineSchema = z
    .object({
        LineID: z.string().optional().describe('Unique identifier for the journal line.'),
        Description: z.string().optional().describe('Description of the journal line.'),
        AccountCode: z.string().optional().describe('Account code for the journal line.'),
        AccountID: z.string().optional().describe('Account ID for the journal line.'),
        TaxType: z.string().optional().describe('Tax type applied to the journal line.'),
        Tracking: z.array(TrackingSchema).optional().describe('Tracking categories for the journal line.'),
        LineAmount: z.number().optional().describe('Monetary amount of the journal line.'),
        TaxAmount: z.number().optional().describe('Tax amount for the journal line.'),
        IsBlank: z.boolean().optional().describe('Whether the journal line is blank.')
    })
    .passthrough();

const ValidationErrorSchema = z
    .object({
        Message: z.string().optional().describe('Validation error message.')
    })
    .passthrough();

const ManualJournalSchema = z
    .object({
        ManualJournalID: z.string().optional().describe('Unique identifier for the manual journal.'),
        Date: z.string().optional().describe('Date of the manual journal. Format: YYYY-MM-DD.'),
        Status: z.string().optional().describe('Status of the manual journal. Example: POSTED, DRAFT, DELETED.'),
        LineAmountTypes: z.string().optional().describe('Line amount types. Example: Inclusive, Exclusive, NoTax.'),
        UpdatedDateUTC: z.string().optional().describe('Last modified date in UTC.'),
        Narration: z.string().optional().describe('Narration or description of the manual journal.'),
        JournalLines: z.array(LineSchema).optional().describe('Journal lines for the manual journal.'),
        Url: z.string().optional().describe('URL to the manual journal in Xero.'),
        HasAttachments: z.boolean().optional().describe('Whether the manual journal has attachments.'),
        ManualJournalNumber: z.string().optional().describe('Manual journal number.'),
        ShowOnCashBasisReports: z.boolean().optional().describe('Whether to show on cash basis reports.'),
        HasErrors: z.boolean().optional().describe('Whether the manual journal has validation errors.'),
        ValidationErrors: z.array(ValidationErrorSchema).optional().describe('Validation errors for the manual journal.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        manualJournals: z.array(ManualJournalSchema).describe('List of manual journals returned by Xero.'),
        nextCursor: z.string().optional().describe('Pagination cursor for the next page. Omit if there are no more pages.')
    })
    .describe('Output for listing manual journals');

/**
 * @tags: [read]
 * @tagReason: Retrieves manual journals from Xero via GET api.xro/2.0/ManualJournals.
 * @pitfalls: Deleted journals are included in unfiltered results; filter with the where parameter by Status. Dates are returned in Microsoft JSON Date format (/Date(...)/) rather than YYYY-MM-DD.
 */
const action = createAction({
    description: 'List manual journals with filters and pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.manualjournals'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const val = connection.connection_config['tenant_id'];
            if (typeof val === 'string' && val.length > 0) {
                tenantId = val;
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object') {
            const val = connection.metadata['tenantId'];
            if (typeof val === 'string' && val.length > 0) {
                tenantId = val;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview (Connections/tenant-discovery)
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const data = connectionsResponse.data;
            if (!Array.isArray(data) || data.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (data.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const first = data[0];
            if (first && typeof first === 'object' && first !== null) {
                const val = first['tenantId'];
                if (typeof val === 'string' && val.length > 0) {
                    tenantId = val;
                }
            }
        }

        if (!tenantId || tenantId.length === 0) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string.'
            });
        }

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (input.modified_since !== undefined && input.modified_since.length > 0) {
            headers['If-Modified-Since'] = input.modified_since;
        }

        // https://developer.xero.com/documentation/api/accounting/manualjournals
        const response = await nango.get({
            endpoint: 'api.xro/2.0/ManualJournals',
            params: {
                page: String(page),
                ...(input.where !== undefined && input.where.length > 0 && { where: input.where })
            },
            headers,
            retries: 3
        });

        const rawData = response.data ?? {};
        const providerData = ProviderResponseSchema.parse(rawData);

        const manualJournals = providerData.ManualJournals ?? [];
        const pagination = providerData.pagination;

        let nextCursor: string | undefined;
        if (pagination && pagination.page < pagination.pageCount) {
            nextCursor = String(pagination.page + 1);
        }

        return {
            manualJournals,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
