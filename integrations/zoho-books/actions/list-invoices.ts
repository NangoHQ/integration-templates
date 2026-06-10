import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().int().min(1).max(200).optional().describe('Records per page. Default: 200. Max: 200.'),
    invoice_number: z.string().optional().describe('Search by invoice number. Example: "INV-00001"'),
    customer_id: z.string().optional().describe('Search by customer ID. Example: "260815000000097001"'),
    status: z.string().optional().describe('Filter by status: sent, draft, overdue, paid, void, unpaid, partially_paid, viewed'),
    date: z.string().optional().describe('Exact invoice date (yyyy-mm-dd).'),
    date_start: z.string().optional().describe('Invoice date on or after (yyyy-mm-dd).'),
    date_end: z.string().optional().describe('Invoice date on or before (yyyy-mm-dd).'),
    due_date: z.string().optional().describe('Due date (yyyy-mm-dd).'),
    due_date_start: z.string().optional().describe('Due date on or after (yyyy-mm-dd).'),
    due_date_end: z.string().optional().describe('Due date on or before (yyyy-mm-dd).'),
    search_text: z.string().optional().describe('General search across invoice number, PO, or customer name.'),
    sort_column: z.string().optional().describe('Sort by: customer_name, invoice_number, date, due_date, total, balance, created_time.')
});

const InvoiceSchema = z
    .object({
        invoice_id: z.string().optional(),
        invoice_number: z.string().optional(),
        customer_id: z.string().optional(),
        customer_name: z.string().optional(),
        status: z.string().optional(),
        date: z.string().optional(),
        due_date: z.string().optional(),
        total: z.number().optional(),
        balance: z.number().optional(),
        currency_code: z.string().optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional()
    })
    .passthrough();

const PageContextSchema = z.object({
    page: z.number().int().optional(),
    per_page: z.number().int().optional(),
    has_more_page: z.boolean().optional(),
    report_name: z.string().optional(),
    applied_filter: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.string().optional(),
    response_option: z.number().int().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().int(),
    message: z.string().optional(),
    invoices: z.array(InvoiceSchema).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z.object({
    invoices: z.array(InvoiceSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List invoices from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-invoices',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.invoices.READ', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0 || !orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer string'
            });
        }

        const params: { [key: string]: string | number } = {
            organization_id: organizationId,
            page: page
        };

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.invoice_number !== undefined) {
            params['invoice_number'] = input.invoice_number;
        }
        if (input.customer_id !== undefined) {
            params['customer_id'] = input.customer_id;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.date !== undefined) {
            params['date'] = input.date;
        }
        if (input.date_start !== undefined) {
            params['date_start'] = input.date_start;
        }
        if (input.date_end !== undefined) {
            params['date_end'] = input.date_end;
        }
        if (input.due_date !== undefined) {
            params['due_date'] = input.due_date;
        }
        if (input.due_date_start !== undefined) {
            params['due_date_start'] = input.due_date_start;
        }
        if (input.due_date_end !== undefined) {
            params['due_date_end'] = input.due_date_end;
        }
        if (input.search_text !== undefined) {
            params['search_text'] = input.search_text;
        }
        if (input.sort_column !== undefined) {
            params['sort_column'] = input.sort_column;
        }

        // https://www.zoho.com/books/api/v3/invoices/#list-invoices
        const response = await nango.get({
            endpoint: '/books/v3/invoices',
            params: params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message ?? 'Unknown error from Zoho Books',
                code: providerResponse.code
            });
        }

        const invoices = providerResponse.invoices ?? [];
        const pageContext = providerResponse.page_context;
        const hasMorePage = pageContext?.has_more_page ?? false;
        const nextPage = hasMorePage ? page + 1 : undefined;

        return {
            invoices: invoices,
            ...(nextPage !== undefined && { next_cursor: String(nextPage) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
