import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    per_page: z.number().optional().describe('Number of records per page.'),
    status: z.string().optional().describe('Filter by status. Allowed values: open, closed, void, draft.'),
    customer_id: z.string().optional().describe('Filter by customer ID.'),
    search_text: z.string().optional().describe('Search text across credit note number, customer name, and reference number.')
});

const CreditNoteSchema = z
    .object({
        creditnote_id: z.string(),
        creditnote_number: z.string().optional(),
        status: z.string().optional(),
        reference_number: z.string().optional(),
        date: z.string().optional(),
        total: z.number().optional(),
        balance: z.number().optional(),
        location_id: z.string().optional(),
        location_name: z.string().optional(),
        customer_id: z.string().optional(),
        customer_name: z.string().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional(),
        is_emailed: z.boolean().optional()
    })
    .passthrough();

const PageContextSchema = z
    .object({
        page: z.number().optional(),
        per_page: z.number().optional(),
        has_more_page: z.boolean().optional(),
        report_name: z.string().optional(),
        sort_column: z.string().optional(),
        sort_order: z.string().optional()
    })
    .optional();

const ListResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    creditnotes: z.array(z.unknown()).optional(),
    page_context: PageContextSchema
});

const OutputSchema = z.object({
    items: z.array(CreditNoteSchema),
    next_cursor: z.string().optional().describe('Next page cursor if more pages exist.')
});

const action = createAction({
    description: 'List credit notes from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-credit-notes',
        group: 'Credit Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.creditnotes.READ', 'ZohoBooks.settings.READ'],

    exec: async (nango, input) => {
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

        if (input.cursor && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid positive integer page number.'
            });
        }
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid positive integer page number.'
            });
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/credit-notes/#list-all-credit-notes
            endpoint: '/books/v3/creditnotes',
            params: {
                organization_id: organizationId,
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
                ...(input.search_text !== undefined && { search_text: input.search_text })
            },
            retries: 3
        });

        const parsedResponse = ListResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Zoho Books credit notes response.'
            });
        }

        const data = parsedResponse.data;
        const creditnotes = Array.isArray(data.creditnotes) ? data.creditnotes : [];

        let nextCursor: string | undefined;
        if (data.page_context && data.page_context.has_more_page === true) {
            nextCursor = String(page + 1);
        }

        const items = creditnotes.map((item) => {
            const parsedItem = CreditNoteSchema.safeParse(item);
            if (!parsedItem.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse credit note from provider response.'
                });
            }
            return parsedItem.data;
        });

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
