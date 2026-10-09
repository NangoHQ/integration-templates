import { z } from 'zod';
import { createAction } from 'nango';

const ProviderCustomFieldSchema = z.record(z.string(), z.unknown());

const ProviderContactPersonSchema = z.object({
    contact_id: z.union([z.string(), z.number()]),
    contact_name: z.union([z.string(), z.number()]).nullable().optional(),
    contact_person_id: z.union([z.string(), z.number()]),
    salutation: z.union([z.string(), z.number()]).nullable().optional(),
    first_name: z.union([z.string(), z.number()]).nullable().optional(),
    last_name: z.union([z.string(), z.number()]).nullable().optional(),
    email: z.union([z.string(), z.number()]).nullable().optional(),
    phone: z.union([z.string(), z.number()]).nullable().optional(),
    mobile: z.union([z.string(), z.number()]).nullable().optional(),
    department: z.union([z.string(), z.number()]).nullable().optional(),
    designation: z.union([z.string(), z.number()]).nullable().optional(),
    skype: z.union([z.string(), z.number()]).nullable().optional(),
    fax: z.union([z.string(), z.number()]).nullable().optional(),
    currency_code: z.union([z.string(), z.number()]).nullable().optional(),
    created_time: z.union([z.string(), z.number()]).nullable().optional(),
    is_primary_contact: z.boolean().nullable().optional(),
    is_added_in_portal: z.boolean().nullable().optional(),
    contactperson_custom_fields: z.array(ProviderCustomFieldSchema).nullable().optional()
});

const ProviderPageContextSchema = z.object({
    page: z.number().nullable().optional(),
    per_page: z.number().nullable().optional(),
    has_more_page: z.boolean().nullable().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    contact_persons: z.array(ProviderContactPersonSchema).optional(),
    page_context: ProviderPageContextSchema.nullable().optional()
});

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .optional()
            .describe('Zoho organization ID that owns the contact persons. Falls back to the connection metadata organization_id when omitted.'),
        contact_id: z
            .string()
            .optional()
            .describe('Only return contact persons belonging to this contact. Omit to return contact persons across the whole organization.'),
        page: z.number().int().positive().optional().describe('Page number to fetch (1-based). Defaults to 1.'),
        per_page: z.number().int().positive().optional().describe('Number of contact persons to return per page. Defaults to 200.')
    })
    .describe('Parameters for listing contact persons.');

const ContactPersonSchema = z.object({
    contact_id: z.string().describe('ID of the contact that owns this contact person.'),
    contact_person_id: z.string().describe('Unique identifier of the contact person.'),
    contact_name: z.string().optional().describe('Name of the contact that owns this contact person.'),
    salutation: z.string().optional().describe('Salutation of the contact person, e.g. "Mr".'),
    first_name: z.string().optional().describe('First name of the contact person.'),
    last_name: z.string().optional().describe('Last name of the contact person.'),
    email: z.string().optional().describe('Email address of the contact person.'),
    phone: z.string().optional().describe('Phone number of the contact person.'),
    mobile: z.string().optional().describe('Mobile number of the contact person.'),
    department: z.string().optional().describe('Department the contact person belongs to.'),
    designation: z.string().optional().describe('Job designation of the contact person.'),
    skype: z.string().optional().describe('Skype address of the contact person.'),
    fax: z.string().optional().describe('Fax number of the contact person.'),
    currency_code: z.string().optional().describe('Currency code associated with the contact person.'),
    created_time: z.string().optional().describe('Time the contact person was created, in Zoho\'s human-readable format (e.g. "09 Oct 2026").'),
    is_primary_contact: z.boolean().optional().describe('Whether this contact person is the primary contact for its contact.'),
    is_added_in_portal: z.boolean().optional().describe('Whether the contact person has portal access.'),
    contactperson_custom_fields: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Custom fields configured for the contact person, as key/value objects.')
});

const PageContextSchema = z.object({
    page: z.number().optional().describe('Current page number (1-based).'),
    per_page: z.number().optional().describe('Maximum number of contact persons per page.'),
    has_more_page: z.boolean().optional().describe('Whether additional pages are available.')
});

const OutputSchema = z
    .object({
        contact_persons: z.array(ContactPersonSchema).describe('Contact persons matching the request.'),
        page_context: PageContextSchema.optional().describe('Pagination state for this page of results.')
    })
    .describe('Contact persons returned for the requested organization and optional contact filter.');

function toOptionalString(value: string | number | null | undefined): string | undefined {
    return value == null ? undefined : String(value);
}

/**
 * @tags: [read]
 * @tagReason: Only reads contact persons from the provider; it performs no provider mutation.
 * @pitfalls: organization_id is required by the provider and cannot be discovered through this connection's permissions, so pass it explicitly or set the connection metadata organization_id; omitting contact_id returns contact persons across every contact in the organization.
 */
const action = createAction({
    description: 'List contact persons across the organization, optionally filtered to a single contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ organization_id?: string | number | null }>();
        const organizationId = input.organization_id ?? toOptionalString(metadata?.organization_id);

        if (organizationId === undefined) {
            throw new nango.ActionError({
                type: 'missing_organization_id',
                message: 'An organization_id is required. Pass it as input or set the connection metadata organization_id.'
            });
        }

        const params: Record<string, string | number> = {
            organization_id: organizationId
        };

        if (input.contact_id !== undefined) {
            params['contact_id'] = input.contact_id;
        }
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        const response = await nango.get<unknown>({
            // https://www.zoho.com/invoice/api/v3/contact-persons/#list-contact-persons
            endpoint: '/invoice/v3/contacts/contactpersons',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== undefined && parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message ?? 'Zoho Invoice returned an error.',
                code: parsed.code
            });
        }

        if (parsed.contact_persons === undefined) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Zoho Invoice did not return a contact_persons array.'
            });
        }

        const contactPersons = parsed.contact_persons.map((person) => ({
            contact_id: String(person.contact_id),
            contact_person_id: String(person.contact_person_id),
            ...(person.contact_name != null && { contact_name: String(person.contact_name) }),
            ...(person.salutation != null && { salutation: String(person.salutation) }),
            ...(person.first_name != null && { first_name: String(person.first_name) }),
            ...(person.last_name != null && { last_name: String(person.last_name) }),
            ...(person.email != null && { email: String(person.email) }),
            ...(person.phone != null && { phone: String(person.phone) }),
            ...(person.mobile != null && { mobile: String(person.mobile) }),
            ...(person.department != null && { department: String(person.department) }),
            ...(person.designation != null && { designation: String(person.designation) }),
            ...(person.skype != null && { skype: String(person.skype) }),
            ...(person.fax != null && { fax: String(person.fax) }),
            ...(person.currency_code != null && { currency_code: String(person.currency_code) }),
            ...(person.created_time != null && { created_time: String(person.created_time) }),
            ...(person.is_primary_contact != null && { is_primary_contact: person.is_primary_contact }),
            ...(person.is_added_in_portal != null && { is_added_in_portal: person.is_added_in_portal }),
            ...(person.contactperson_custom_fields != null && { contactperson_custom_fields: person.contactperson_custom_fields })
        }));

        const pageContext = parsed.page_context;

        return {
            contact_persons: contactPersons,
            ...(pageContext != null && {
                page_context: {
                    ...(pageContext.page != null && { page: pageContext.page }),
                    ...(pageContext.per_page != null && { per_page: pageContext.per_page }),
                    ...(pageContext.has_more_page != null && { has_more_page: pageContext.has_more_page })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
