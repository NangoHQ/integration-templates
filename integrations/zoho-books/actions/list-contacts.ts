import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. For Zoho Books, this is the page number. Omit for the first page.'),
    per_page: z.number().optional().describe('Number of records to be fetched per page.'),
    contact_type: z.string().optional().describe('Search contacts by contact type. Allowed Values: customer, vendor.'),
    contact_name: z.string().optional().describe('Search contacts by contact name. Max-length 100.'),
    company_name: z.string().optional().describe('Search contacts by company name. Max-length 100.'),
    email: z.string().optional().describe('Search contacts by email of the primary contact person. Max-length 100.'),
    phone: z.string().optional().describe('Search contacts by phone number of the primary contact person. Max-length 100.'),
    filter_by: z
        .string()
        .optional()
        .describe(
            'Filter contacts by status. Allowed Values: Status.All, Status.Active, Status.Inactive, Status.Duplicate, Status.PortalEnabled, Status.PortalDisabled, Invoice.OverDue, Invoice.Unpaid, Status.CreditLimitExceed and Status.Crm.'
        ),
    search_text: z.string().optional().describe('Search contacts by contact name or notes. Max-length 100.'),
    sort_column: z
        .string()
        .optional()
        .describe(
            'Sort contacts. Allowed Values: contact_name, first_name, last_name, email, outstanding_receivable_amount, created_time and last_modified_time.'
        )
});

const ProviderContactSchema = z.object({
    contact_id: z.union([z.string(), z.number()]),
    contact_name: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    contact_type: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    payment_terms: z.number().optional().nullable(),
    payment_terms_label: z.string().optional().nullable(),
    currency_id: z.union([z.string(), z.number()]).optional().nullable(),
    currency_code: z.string().optional().nullable(),
    outstanding_receivable_amount: z.number().optional().nullable(),
    unused_credits_receivable_amount: z.number().optional().nullable(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    mobile: z.string().optional().nullable(),
    created_time: z.string().optional().nullable(),
    last_modified_time: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    contacts: z.array(ProviderContactSchema),
    page_context: z
        .object({
            page: z.number(),
            per_page: z.number(),
            has_more_page: z.boolean(),
            applied_filter: z.string().optional().nullable(),
            sort_column: z.string().optional().nullable(),
            sort_order: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const OutputContactSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string().optional(),
    company_name: z.string().optional(),
    contact_type: z.string().optional(),
    status: z.string().optional(),
    payment_terms: z.number().optional(),
    payment_terms_label: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    outstanding_receivable_amount: z.number().optional(),
    unused_credits_receivable_amount: z.number().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const OutputSchema = z.object({
    contacts: z.array(OutputContactSchema),
    next_cursor: z.string().optional().describe('Next page cursor to fetch the following page. Absent if there are no more pages.')
});

const action = createAction({
    description: 'List contacts from Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.contacts.READ', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
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

        const page = input.cursor ? Number(input.cursor) : 1;

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/contacts/#list-contacts
            endpoint: '/books/v3/contacts',
            params: {
                organization_id: organizationId,
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                ...(input.contact_type !== undefined && { contact_type: input.contact_type }),
                ...(input.contact_name !== undefined && { contact_name: input.contact_name }),
                ...(input.company_name !== undefined && { company_name: input.company_name }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.filter_by !== undefined && { filter_by: input.filter_by }),
                ...(input.search_text !== undefined && { search_text: input.search_text }),
                ...(input.sort_column !== undefined && { sort_column: input.sort_column })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const contacts = providerResponse.contacts.map((contact) => {
            const mapped: z.infer<typeof OutputContactSchema> = {
                contact_id: String(contact.contact_id)
            };

            if (contact.contact_name != null) {
                mapped.contact_name = contact.contact_name;
            }
            if (contact.company_name != null) {
                mapped.company_name = contact.company_name;
            }
            if (contact.contact_type != null) {
                mapped.contact_type = contact.contact_type;
            }
            if (contact.status != null) {
                mapped.status = contact.status;
            }
            if (contact.payment_terms != null) {
                mapped.payment_terms = contact.payment_terms;
            }
            if (contact.payment_terms_label != null) {
                mapped.payment_terms_label = contact.payment_terms_label;
            }
            if (contact.currency_id != null) {
                mapped.currency_id = String(contact.currency_id);
            }
            if (contact.currency_code != null) {
                mapped.currency_code = contact.currency_code;
            }
            if (contact.outstanding_receivable_amount != null) {
                mapped.outstanding_receivable_amount = contact.outstanding_receivable_amount;
            }
            if (contact.unused_credits_receivable_amount != null) {
                mapped.unused_credits_receivable_amount = contact.unused_credits_receivable_amount;
            }
            if (contact.first_name != null) {
                mapped.first_name = contact.first_name;
            }
            if (contact.last_name != null) {
                mapped.last_name = contact.last_name;
            }
            if (contact.email != null) {
                mapped.email = contact.email;
            }
            if (contact.phone != null) {
                mapped.phone = contact.phone;
            }
            if (contact.mobile != null) {
                mapped.mobile = contact.mobile;
            }
            if (contact.created_time != null) {
                mapped.created_time = contact.created_time;
            }
            if (contact.last_modified_time != null) {
                mapped.last_modified_time = contact.last_modified_time;
            }

            return mapped;
        });

        const nextCursor =
            providerResponse.page_context && providerResponse.page_context.has_more_page ? String(providerResponse.page_context.page + 1) : undefined;

        return {
            contacts,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
