import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe(
                'Zoho Invoice organization ID. Required on every Zoho Invoice request; this connection has no in-scope way to discover it. Example: "927270289".'
            ),
        contact_id: z.string().describe('ID of the existing contact to add the contact person to. Example: "460000000026049".'),
        first_name: z.string().describe('First name of the contact person. Required by Zoho. Example: "Will".'),
        last_name: z.string().optional().describe('Last name of the contact person. Example: "Smith".'),
        email: z.string().optional().describe('Email address of the contact person. Example: "test@example.com".'),
        phone: z.string().optional().describe('Phone number of the contact person.'),
        mobile: z.string().optional().describe('Mobile number of the contact person.'),
        salutation: z.string().optional().describe('Salutation for the contact person. Example: "Mr".'),
        skype: z.string().optional().describe('Skype handle of the contact person.'),
        designation: z.string().optional().describe('Job title of the contact person. Example: "Sales Engineer".'),
        department: z.string().optional().describe('Department the contact person belongs to. Example: "Sales".'),
        enable_portal: z.boolean().optional().describe('Whether to grant portal access to the contact person.'),
        is_primary_contact: z
            .boolean()
            .optional()
            .describe('When true, the new contact person is marked as the primary contact for the contact after creation.')
    })
    .describe('Input for adding a contact person to an existing Zoho Invoice contact.');

const ProviderContactPersonSchema = z.object({
    contact_id: z.string(),
    contact_person_id: z.string(),
    salutation: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.coerce.string().optional(),
    mobile: z.coerce.string().optional(),
    skype: z.string().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    is_primary_contact: z.boolean().optional(),
    is_added_in_portal: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    contact_person: z.union([ProviderContactPersonSchema, z.array(ProviderContactPersonSchema)]).optional()
});

const ProviderStatusResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const ContactPersonSchema = z.object({
    contact_id: z.string().describe('ID of the contact the contact person belongs to.'),
    contact_person_id: z.string().describe('Unique ID of the newly created contact person.'),
    salutation: z.string().optional().describe('Salutation of the contact person.'),
    first_name: z.string().optional().describe('First name of the contact person.'),
    last_name: z.string().optional().describe('Last name of the contact person.'),
    email: z.string().optional().describe('Email address of the contact person.'),
    phone: z.string().optional().describe('Phone number of the contact person.'),
    mobile: z.string().optional().describe('Mobile number of the contact person.'),
    skype: z.string().optional().describe('Skype handle of the contact person.'),
    designation: z.string().optional().describe('Job title of the contact person.'),
    department: z.string().optional().describe('Department the contact person belongs to.'),
    is_primary_contact: z.boolean().optional().describe('Whether this contact person is the primary contact for the contact.'),
    is_added_in_portal: z.boolean().optional().describe('Whether the contact person has portal access.')
});

const OutputSchema = z
    .object({
        contact_person: ContactPersonSchema.describe('The contact person that was created.')
    })
    .describe('The newly created contact person.');

/**
 * @tags: [write]
 * @tagReason: Creates a contact person on an existing contact (and optionally marks it as primary) through the Zoho Invoice API.
 * @pitfalls: Zoho rejects a contact person whose email duplicates an existing one, and the first contact person on a contact automatically becomes primary; is_primary_contact: true is applied with a separate step, so the person can still be created if marking primary fails, and it replaces the contact's existing primary contact person.
 */
const action = createAction({
    description: 'Add a new contact person to an existing contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.contacts.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            contact_id: input.contact_id,
            first_name: input.first_name,
            ...(input.last_name !== undefined && { last_name: input.last_name }),
            ...(input.email !== undefined && { email: input.email }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.mobile !== undefined && { mobile: input.mobile }),
            ...(input.salutation !== undefined && { salutation: input.salutation }),
            ...(input.skype !== undefined && { skype: input.skype }),
            ...(input.designation !== undefined && { designation: input.designation }),
            ...(input.department !== undefined && { department: input.department }),
            ...(input.enable_portal !== undefined && { enable_portal: input.enable_portal })
        };

        // https://www.zoho.com/invoice/api/v3/contact-persons/#create-a-contact-person
        const response = await nango.post({
            endpoint: '/invoice/v3/contacts/contactpersons',
            params: {
                organization_id: input.organization_id
            },
            data,
            // Non-idempotent create: a retry after a lost response would create a duplicate contact person.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const contactPerson = Array.isArray(parsed.contact_person) ? parsed.contact_person[0] : parsed.contact_person;

        if (!contactPerson) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Zoho Invoice did not return the created contact person.'
            });
        }

        let isPrimary = contactPerson.is_primary_contact ?? false;

        if (input.is_primary_contact === true) {
            // https://www.zoho.com/invoice/api/v3/contact-persons/#mark-as-primary-contact-person
            const primaryResponse = await nango.post({
                endpoint: `/invoice/v3/contacts/contactpersons/${encodeURIComponent(contactPerson.contact_person_id)}/primary`,
                params: {
                    organization_id: input.organization_id
                },
                // Idempotent: marking the same person primary repeatedly yields the same state.
                retries: 3
            });

            const primaryResult = ProviderStatusResponseSchema.parse(primaryResponse.data);
            if (primaryResult.code !== 0) {
                throw new nango.ActionError({
                    type: 'mark_primary_failed',
                    message: `Contact person ${contactPerson.contact_person_id} was created but could not be marked as primary: ${primaryResult.message}`,
                    code: primaryResult.code,
                    contact_person_id: contactPerson.contact_person_id
                });
            }
            isPrimary = true;
        }

        return {
            contact_person: {
                contact_id: contactPerson.contact_id,
                contact_person_id: contactPerson.contact_person_id,
                ...(contactPerson.salutation != null && { salutation: contactPerson.salutation }),
                ...(contactPerson.first_name != null && { first_name: contactPerson.first_name }),
                ...(contactPerson.last_name != null && { last_name: contactPerson.last_name }),
                ...(contactPerson.email != null && { email: contactPerson.email }),
                ...(contactPerson.phone != null && { phone: contactPerson.phone }),
                ...(contactPerson.mobile != null && { mobile: contactPerson.mobile }),
                ...(contactPerson.skype != null && { skype: contactPerson.skype }),
                ...(contactPerson.designation != null && { designation: contactPerson.designation }),
                ...(contactPerson.department != null && { department: contactPerson.department }),
                is_primary_contact: isPrimary,
                ...(contactPerson.is_added_in_portal != null && { is_added_in_portal: contactPerson.is_added_in_portal })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
