import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const FilterBySchema = z.enum(['Status.All', 'Status.Active', 'Status.Inactive', 'Status.Duplicate', 'Status.Crm']);

const SortColumnSchema = z.enum(['contact_name', 'first_name', 'last_name', 'email', 'outstanding_receivable_amount', 'created_time', 'last_modified_time']);

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        page: z.number().int().positive().optional().describe('Page number to fetch. Defaults to 1.'),
        per_page: z.number().int().min(1).max(200).optional().describe('Number of contacts to return per page (1-200). Defaults to 200.'),
        filter_by: FilterBySchema.optional().describe('Filter contacts by status. Defaults to Status.All.'),
        search_text: z.string().optional().describe('Search contacts by contact name or notes.'),
        sort_column: SortColumnSchema.optional().describe('Column to sort contacts by.'),
        contact_name: z.string().optional().describe('Exact match on contact name.'),
        contact_name_startswith: z.string().optional().describe('Contacts whose name starts with this value.'),
        contact_name_contains: z.string().optional().describe('Contacts whose name contains this value.'),
        company_name: z.string().optional().describe('Exact match on company name.'),
        company_name_startswith: z.string().optional().describe('Contacts whose company name starts with this value.'),
        company_name_contains: z.string().optional().describe('Contacts whose company name contains this value.'),
        email: z.string().optional().describe('Exact match on contact email.'),
        email_startswith: z.string().optional().describe('Contacts whose email starts with this value.'),
        email_contains: z.string().optional().describe('Contacts whose email contains this value.'),
        phone: z.string().optional().describe('Exact match on contact phone number.'),
        phone_startswith: z.string().optional().describe('Contacts whose phone starts with this value.'),
        phone_contains: z.string().optional().describe('Contacts whose phone contains this value.')
    })
    .describe('Filters and pagination for listing Zoho Inventory contacts.');

const ProviderContactSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string(),
    company_name: z.string().nullish(),
    contact_type: z.string().nullish(),
    status: z.string().nullish(),
    customer_sub_type: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    mobile: z.string().nullish(),
    website: z.string().nullish(),
    currency_code: z.string().nullish(),
    payment_terms: z.number().nullish(),
    payment_terms_label: z.string().nullish(),
    outstanding_receivable_amount: z.number().nullish(),
    outstanding_payable_amount: z.number().nullish(),
    unused_credits_receivable_amount: z.number().nullish(),
    is_linked_with_zohocrm: z.boolean().nullish(),
    portal_status: z.string().nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish()
});

const ProviderPageContextSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    has_more_page: z.boolean(),
    sort_column: z.string().nullish(),
    sort_order: z.string().nullish(),
    applied_filter: z.string().nullish(),
    report_name: z.string().nullish()
});

const ProviderEnvelopeSchema = z.object({
    code: z.number(),
    message: z.string().optional()
});

const ProviderContactsResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    contacts: z.array(ProviderContactSchema),
    page_context: ProviderPageContextSchema
});

const ContactSchema = z.object({
    contact_id: z.string().describe('Unique Zoho Inventory contact ID.'),
    contact_name: z.string().describe('Display name of the contact (organization or individual).'),
    company_name: z.string().optional().describe('Company name associated with the contact.'),
    contact_type: z.string().optional().describe('Contact type, e.g. "customer" or "vendor".'),
    status: z.string().optional().describe('Contact status, e.g. "active" or "inactive".'),
    customer_sub_type: z.string().optional().describe('Customer sub type, e.g. "business" or "individual".'),
    first_name: z.string().optional().describe('First name of the contact person.'),
    last_name: z.string().optional().describe('Last name of the contact person.'),
    email: z.string().optional().describe('Primary email address of the contact.'),
    phone: z.string().optional().describe('Primary phone number of the contact.'),
    mobile: z.string().optional().describe('Mobile number of the contact.'),
    website: z.string().optional().describe('Website of the contact.'),
    currency_code: z.string().optional().describe('Currency code used for the contact, e.g. "USD".'),
    payment_terms: z.number().optional().describe('Net payment term in days for the contact.'),
    payment_terms_label: z.string().optional().describe('Label of the payment term, e.g. "Net 15".'),
    outstanding_receivable_amount: z.number().optional().describe('Amount receivable from the contact that is still outstanding.'),
    outstanding_payable_amount: z.number().optional().describe('Amount payable to the contact that is still outstanding.'),
    unused_credits_receivable_amount: z.number().optional().describe('Unused credits receivable from the contact.'),
    is_linked_with_zohocrm: z.boolean().optional().describe('Whether the contact is linked to Zoho CRM.'),
    portal_status: z.string().optional().describe('Customer portal status, e.g. "enabled" or "disabled".'),
    created_time: z.string().optional().describe('Creation timestamp in the organization timezone, e.g. "2026-06-09T09:45:19-0400".'),
    last_modified_time: z.string().optional().describe('Last modification timestamp in the organization timezone.')
});

const PageContextSchema = z.object({
    page: z.number().describe('Current page number.'),
    per_page: z.number().describe('Number of contacts returned per page.'),
    has_more_page: z.boolean().describe('Whether another page of contacts is available.'),
    sort_column: z.string().optional().describe('Column the results are sorted by.'),
    sort_order: z.string().optional().describe('Sort direction, e.g. "A" for ascending or "D" for descending.'),
    applied_filter: z.string().optional().describe('Status filter applied to the results.'),
    report_name: z.string().optional().describe('Name of the underlying report, e.g. "Contacts".')
});

const OutputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Inventory organization ID the contacts were listed from.'),
        contacts: z.array(ContactSchema).describe('Contacts matching the supplied filters.'),
        page_context: PageContextSchema.describe('Pagination and sorting metadata for the returned page.'),
        next_page: z.number().int().optional().describe('Page number to request next. Omitted when there are no more pages.')
    })
    .describe('A page of Zoho Inventory contacts with pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Lists contacts from the provider without creating, modifying, or deleting any data.
 * @pitfalls: The name, company, email, and phone filters match exactly, so use their _startswith/_contains variants for partial matches; by default filter_by is Status.All, so inactive contacts are included unless Status.Active is requested.
 */
const action = createAction({
    description: 'List customers and vendors (contacts) in a Zoho Inventory organization, with name, email, and phone search plus active/inactive filtering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.contacts.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const params: Record<string, string | number> = {
            organization_id: organizationId
        };

        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.filter_by !== undefined) {
            params['filter_by'] = input.filter_by;
        }
        if (input.search_text !== undefined) {
            params['search_text'] = input.search_text;
        }
        if (input.sort_column !== undefined) {
            params['sort_column'] = input.sort_column;
        }
        if (input.contact_name !== undefined) {
            params['contact_name'] = input.contact_name;
        }
        if (input.contact_name_startswith !== undefined) {
            params['contact_name_startswith'] = input.contact_name_startswith;
        }
        if (input.contact_name_contains !== undefined) {
            params['contact_name_contains'] = input.contact_name_contains;
        }
        if (input.company_name !== undefined) {
            params['company_name'] = input.company_name;
        }
        if (input.company_name_startswith !== undefined) {
            params['company_name_startswith'] = input.company_name_startswith;
        }
        if (input.company_name_contains !== undefined) {
            params['company_name_contains'] = input.company_name_contains;
        }
        if (input.email !== undefined) {
            params['email'] = input.email;
        }
        if (input.email_startswith !== undefined) {
            params['email_startswith'] = input.email_startswith;
        }
        if (input.email_contains !== undefined) {
            params['email_contains'] = input.email_contains;
        }
        if (input.phone !== undefined) {
            params['phone'] = input.phone;
        }
        if (input.phone_startswith !== undefined) {
            params['phone_startswith'] = input.phone_startswith;
        }
        if (input.phone_contains !== undefined) {
            params['phone_contains'] = input.phone_contains;
        }

        // https://www.zoho.com/inventory/api/v1/contacts/#list-contacts
        const response = await nango.get({
            endpoint: '/inventory/v1/contacts',
            params,
            retries: 3
        });

        const envelope = ProviderEnvelopeSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when listing contacts.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.data.message ?? 'Zoho Inventory returned an error while listing contacts.',
                code: envelope.data.code
            });
        }

        const parsed = ProviderContactsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected contacts payload from Zoho Inventory API.',
                details: parsed.error.message
            });
        }

        const parsedResponse = parsed.data;
        const pageContext = parsedResponse.page_context;

        return {
            organization_id: organizationId,
            contacts: parsedResponse.contacts.map((contact) => ({
                contact_id: contact.contact_id,
                contact_name: contact.contact_name,
                ...(contact.company_name != null && { company_name: contact.company_name }),
                ...(contact.contact_type != null && { contact_type: contact.contact_type }),
                ...(contact.status != null && { status: contact.status }),
                ...(contact.customer_sub_type != null && { customer_sub_type: contact.customer_sub_type }),
                ...(contact.first_name != null && { first_name: contact.first_name }),
                ...(contact.last_name != null && { last_name: contact.last_name }),
                ...(contact.email != null && { email: contact.email }),
                ...(contact.phone != null && { phone: contact.phone }),
                ...(contact.mobile != null && { mobile: contact.mobile }),
                ...(contact.website != null && { website: contact.website }),
                ...(contact.currency_code != null && { currency_code: contact.currency_code }),
                ...(contact.payment_terms != null && { payment_terms: contact.payment_terms }),
                ...(contact.payment_terms_label != null && { payment_terms_label: contact.payment_terms_label }),
                ...(contact.outstanding_receivable_amount != null && { outstanding_receivable_amount: contact.outstanding_receivable_amount }),
                ...(contact.outstanding_payable_amount != null && { outstanding_payable_amount: contact.outstanding_payable_amount }),
                ...(contact.unused_credits_receivable_amount != null && {
                    unused_credits_receivable_amount: contact.unused_credits_receivable_amount
                }),
                ...(contact.is_linked_with_zohocrm != null && { is_linked_with_zohocrm: contact.is_linked_with_zohocrm }),
                ...(contact.portal_status != null && { portal_status: contact.portal_status }),
                ...(contact.created_time != null && { created_time: contact.created_time }),
                ...(contact.last_modified_time != null && { last_modified_time: contact.last_modified_time })
            })),
            page_context: {
                page: pageContext.page,
                per_page: pageContext.per_page,
                has_more_page: pageContext.has_more_page,
                ...(pageContext.sort_column != null && { sort_column: pageContext.sort_column }),
                ...(pageContext.sort_order != null && { sort_order: pageContext.sort_order }),
                ...(pageContext.applied_filter != null && { applied_filter: pageContext.applied_filter }),
                ...(pageContext.report_name != null && { report_name: pageContext.report_name })
            },
            ...(pageContext.has_more_page && { next_page: pageContext.page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
