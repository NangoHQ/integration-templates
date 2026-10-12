import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID. Example: "927270289". Required: the provider rejects any call without it, and this connection cannot discover it.'
            ),
        contact_name: z.string().optional().describe('Exact contact name to match. Example: "Acme Corp".'),
        contact_name_contains: z.string().optional().describe('Substring to match anywhere in the contact name. Example: "Acme".'),
        email: z.string().optional().describe('Email address of the contact person to match. Example: "billing@example.com".'),
        contact_type: z.enum(['customer', 'vendor']).optional().describe('Restrict results to contacts of this type.'),
        status: z.enum(['active', 'inactive']).optional().describe('Restrict results to contacts with this status.'),
        last_modified_time: z
            .string()
            .optional()
            .describe('Only return contacts modified at or after this ISO-8601 timestamp with a timezone offset. Example: "2026-10-01T00:00:00+0000".'),
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Defaults to 1.'),
        per_page: z.number().int().positive().optional().describe('Number of contacts per page. Defaults to 200.')
    })
    .describe('Filters and pagination options for listing Zoho Invoice contacts.');

const ContactSchema = z.object({
    contact_id: z.string().describe('Unique contact ID. Example: "260815000000097001".'),
    contact_name: z.string().describe('Display name of the contact. Example: "Acme Corp".'),
    customer_name: z.string().nullish().describe('Name shown when the contact is used as a customer.'),
    vendor_name: z.string().nullish().describe('Name shown when the contact is used as a vendor.'),
    company_name: z.string().nullish().describe('Company name of the contact.'),
    website: z.string().nullish().describe('Website of the contact.'),
    contact_type: z.string().describe('Type of the contact, e.g. "customer" or "vendor".'),
    status: z.string().describe('Status of the contact, e.g. "active" or "inactive".'),
    customer_sub_type: z.string().nullish().describe('Customer sub type, e.g. "business".'),
    source: z.string().nullish().describe('Source that created the contact, e.g. "api".'),
    is_linked_with_zohocrm: z.boolean().nullish().describe('Whether the contact is linked to a Zoho CRM account.'),
    payment_terms: z.number().nullish().describe('Net payment term in days. Example: 15.'),
    payment_terms_label: z.string().nullish().describe('Human-readable payment term label. Example: "Net 15".'),
    currency_id: z.string().nullish().describe('Currency ID used for the contact.'),
    currency_code: z.string().nullish().describe('Currency code used for the contact. Example: "USD".'),
    first_name: z.string().nullish().describe('First name of the primary contact person.'),
    last_name: z.string().nullish().describe('Last name of the primary contact person.'),
    email: z.string().nullish().describe('Email of the primary contact person.'),
    phone: z.string().nullish().describe('Phone number of the primary contact person.'),
    mobile: z.string().nullish().describe('Mobile number of the primary contact person.'),
    outstanding_receivable_amount: z.number().nullish().describe('Amount currently owed by the contact.'),
    unused_credits_receivable_amount: z.number().nullish().describe('Unused credits held for the contact.'),
    created_time: z.string().nullish().describe('Timestamp when the contact was created.'),
    last_modified_time: z.string().nullish().describe('Timestamp when the contact was last modified.')
});

const PageContextSchema = z.object({
    page: z.number().optional(),
    per_page: z.number().optional(),
    has_more_page: z.boolean().optional()
});

const ListContactsResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    contacts: z.array(ContactSchema).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('Contacts returned for the requested page.'),
        page: z.number().describe('Page number that was returned.'),
        per_page: z.number().describe('Number of contacts requested per page.'),
        has_more_page: z.boolean().describe('Whether another page of contacts is available.'),
        next_page: z.number().optional().describe('Page number to request next when has_more_page is true.')
    })
    .describe('A page of Zoho Invoice contacts together with pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Fetches contacts from Zoho Invoice via a read-only GET request and makes no provider changes.
 * @pitfalls: organization_id is required, and results are limited to customer contacts by default.
 */
const action = createAction({
    description: 'List customer and vendor contacts in a Zoho Invoice organization with optional filters and pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.contacts.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.organization_id) {
            throw new nango.ActionError({
                type: 'missing_organization_id',
                message: 'organization_id is required: Zoho Invoice rejects contact queries without it and this connection cannot discover it.'
            });
        }

        // https://www.zoho.com/invoice/api/v3/contacts/#list-contacts
        const response = await nango.get({
            endpoint: '/invoice/v3/contacts',
            params: {
                organization_id: input.organization_id,
                ...(input.contact_name !== undefined && { contact_name: input.contact_name }),
                ...(input.contact_name_contains !== undefined && { contact_name_contains: input.contact_name_contains }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.contact_type !== undefined && { contact_type: input.contact_type }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.last_modified_time !== undefined && { last_modified_time: input.last_modified_time }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const parsed = ListContactsResponseSchema.parse(response.data);
        if (parsed.code !== 0 || parsed.contacts === undefined) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message ?? 'Zoho Invoice response did not include a contacts list.',
                code: parsed.code
            });
        }
        const pageContext = parsed.page_context;
        const page = pageContext?.page ?? input.page ?? 1;
        const perPage = pageContext?.per_page ?? input.per_page ?? 200;
        const hasMorePage = pageContext?.has_more_page ?? false;

        return {
            contacts: parsed.contacts,
            page,
            per_page: perPage,
            has_more_page: hasMorePage,
            ...(hasMorePage && { next_page: page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
