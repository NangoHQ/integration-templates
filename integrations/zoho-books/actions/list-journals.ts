import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of records per page. Example: 10'),
    entry_number: z.string().optional().describe('Search journals by journal entry number.'),
    reference_number: z.string().optional().describe('Search journals by journal reference number.'),
    date: z.string().optional().describe('Search journals by journal date. Format: YYYY-MM-DD'),
    notes: z.string().optional().describe('Search journals by journal notes.'),
    status: z.string().optional().describe('Filter journals by status. Allowed: draft, published, approved, submitted, rejected.'),
    journal_type: z.string().optional().describe('Filter journals by journal type.'),
    account_id: z.string().optional().describe('Filter journals by account ID.'),
    customer_id: z.string().optional().describe('Search journals using Customer ID.'),
    vendor_id: z.string().optional().describe('Search the journals using Vendor ID.'),
    filter_by: z
        .string()
        .optional()
        .describe(
            'Filter journals by journal date. Allowed: JournalDate.All, JournalDate.Today, JournalDate.ThisWeek, JournalDate.ThisMonth, JournalDate.ThisQuarter, JournalDate.ThisYear.'
        ),
    sort_column: z.string().optional().describe('Sort journal list. Allowed: journal_date, entry_number, reference_number, total, last_modified_time.'),
    search_text: z.string().optional().describe('Search journals by text.'),
    journal_ids: z.string().optional().describe('Comma separated journal IDs. Maximum of 200.'),
    journal_entity_type: z
        .string()
        .optional()
        .describe(
            'Filter by journal entity type. Allowed: journal, period_end_journal, consolidation_journal, consolidation_adjustment_journal, elimination_journal, intercompany_journal.'
        ),
    project_id: z.string().optional().describe('Filter by project ID.'),
    branch_ids: z.string().optional().describe('Comma separated branch IDs. Maximum of 200.'),
    location_ids: z.string().optional().describe('Comma separated location IDs. Maximum of 200.'),
    currency: z.string().optional().describe('Filter by currency ID.'),
    tax_id: z.string().optional().describe('Filter by tax ID.'),
    tax_exemption_id: z.string().optional().describe('Filter by tax exemption ID.'),
    tax_authority_id: z.string().optional().describe('Filter by tax authority ID.'),
    period_closure_id: z.string().optional().describe('Filter by period closure ID.'),
    last_modified_time: z.string().optional().describe('Search the journals using Last Modified Time.'),
    total: z.number().optional().describe('Search journals by journal total.'),
    customview_id: z.string().optional().describe('ID of the custom view.'),
    account_code: z.string().optional().describe('Search journals by account code.')
});

const JournalSchema = z.object({
    journal_id: z.string(),
    journal_date: z.string().optional(),
    entry_number: z.string().optional(),
    reference_number: z.string().optional(),
    currency_id: z.string().optional(),
    notes: z.string().optional(),
    journal_type: z.string().optional(),
    entity_type: z.string().optional(),
    total: z.number().optional(),
    bcy_total: z.number().optional(),
    custom_field: z.string().optional(),
    tags: z
        .array(
            z.object({
                tag_id: z.string().optional(),
                tag_name: z.string().optional(),
                tag_option_id: z.string().optional(),
                tag_option_name: z.string().optional(),
                is_tag_mandatory: z.boolean().optional()
            })
        )
        .optional()
});

const PageContextSchema = z.object({
    page: z.number().optional(),
    per_page: z.number().optional(),
    has_more_page: z.boolean().optional(),
    report_name: z.string().optional(),
    applied_filter: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    journals: z.array(JournalSchema).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            journal_id: z.string(),
            journal_date: z.string().optional(),
            entry_number: z.string().optional(),
            reference_number: z.string().optional(),
            currency_id: z.string().optional(),
            notes: z.string().optional(),
            journal_type: z.string().optional(),
            entity_type: z.string().optional(),
            total: z.number().optional(),
            bcy_total: z.number().optional(),
            custom_field: z.string().optional(),
            tags: z
                .array(
                    z.object({
                        tag_id: z.string().optional(),
                        tag_name: z.string().optional(),
                        tag_option_id: z.string().optional(),
                        tag_option_name: z.string().optional(),
                        is_tag_mandatory: z.boolean().optional()
                    })
                )
                .optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List manual journal entries from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-journals',
        group: 'Journals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.accountants.READ', 'ZohoBooks.settings.READ'],

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

        const params: Record<string, string | number> = {
            organization_id: organizationId
        };

        if (input.cursor !== undefined) {
            params['page'] = parseInt(input.cursor, 10);
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.entry_number !== undefined) {
            params['entry_number'] = input.entry_number;
        }
        if (input.reference_number !== undefined) {
            params['reference_number'] = input.reference_number;
        }
        if (input.date !== undefined) {
            params['date'] = input.date;
        }
        if (input.notes !== undefined) {
            params['notes'] = input.notes;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.journal_type !== undefined) {
            params['journal_type'] = input.journal_type;
        }
        if (input.account_id !== undefined) {
            params['account_id'] = input.account_id;
        }
        if (input.customer_id !== undefined) {
            params['customer_id'] = input.customer_id;
        }
        if (input.vendor_id !== undefined) {
            params['vendor_id'] = input.vendor_id;
        }
        if (input.filter_by !== undefined) {
            params['filter_by'] = input.filter_by;
        }
        if (input.sort_column !== undefined) {
            params['sort_column'] = input.sort_column;
        }
        if (input.search_text !== undefined) {
            params['search_text'] = input.search_text;
        }
        if (input.journal_ids !== undefined) {
            params['journal_ids'] = input.journal_ids;
        }
        if (input.journal_entity_type !== undefined) {
            params['journal_entity_type'] = input.journal_entity_type;
        }
        if (input.project_id !== undefined) {
            params['project_id'] = input.project_id;
        }
        if (input.branch_ids !== undefined) {
            params['branch_ids'] = input.branch_ids;
        }
        if (input.location_ids !== undefined) {
            params['location_ids'] = input.location_ids;
        }
        if (input.currency !== undefined) {
            params['currency'] = input.currency;
        }
        if (input.tax_id !== undefined) {
            params['tax_id'] = input.tax_id;
        }
        if (input.tax_exemption_id !== undefined) {
            params['tax_exemption_id'] = input.tax_exemption_id;
        }
        if (input.tax_authority_id !== undefined) {
            params['tax_authority_id'] = input.tax_authority_id;
        }
        if (input.period_closure_id !== undefined) {
            params['period_closure_id'] = input.period_closure_id;
        }
        if (input.last_modified_time !== undefined) {
            params['last_modified_time'] = input.last_modified_time;
        }
        if (input.total !== undefined) {
            params['total'] = input.total;
        }
        if (input.customview_id !== undefined) {
            params['customview_id'] = input.customview_id;
        }
        if (input.account_code !== undefined) {
            params['account_code'] = input.account_code;
        }

        const config: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/journals/#get-journal-list
            endpoint: '/books/v3/journals',
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = (providerResponse.journals || []).map((journal) => ({
            journal_id: journal.journal_id,
            ...(journal.journal_date !== undefined && { journal_date: journal.journal_date }),
            ...(journal.entry_number !== undefined && { entry_number: journal.entry_number }),
            ...(journal.reference_number !== undefined && { reference_number: journal.reference_number }),
            ...(journal.currency_id !== undefined && { currency_id: journal.currency_id }),
            ...(journal.notes !== undefined && { notes: journal.notes }),
            ...(journal.journal_type !== undefined && { journal_type: journal.journal_type }),
            ...(journal.entity_type !== undefined && { entity_type: journal.entity_type }),
            ...(journal.total !== undefined && { total: journal.total }),
            ...(journal.bcy_total !== undefined && { bcy_total: journal.bcy_total }),
            ...(journal.custom_field !== undefined && { custom_field: journal.custom_field }),
            ...(journal.tags !== undefined && { tags: journal.tags })
        }));

        const nextCursor = providerResponse.page_context?.has_more_page ? String((providerResponse.page_context.page || 1) + 1) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
