import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID. Required because this connection cannot discover it. Example: "927270289"'),
        contact_person_id: z.string().describe('ID of the contact person to update. Example: "260815000000166029"'),
        first_name: z.string().describe('First name of the contact person. Example: "Will"'),
        last_name: z.string().optional().describe('Last name of the contact person. Example: "Smith"'),
        salutation: z.string().optional().describe('Salutation for the contact person. Example: "Mr"'),
        email: z.string().optional().describe('Email address of the contact person. Example: "test@zylker.org"'),
        phone: z.string().optional().describe('Phone number of the contact person. Example: "1234"'),
        mobile: z.string().optional().describe('Mobile number of the contact person. Example: "9876543210"'),
        skype: z.string().optional().describe('Skype address of the contact person. Example: "zoho"'),
        designation: z.string().optional().describe('Designation of the contact person in the organization. Example: "Sales Engineer"'),
        department: z.string().optional().describe('Department the contact person belongs to. Example: "Sales"')
    })
    .describe('Details used to update an existing contact person. Omitted fields are left unchanged.');

const ProviderContactPersonSchema = z.object({
    contact_id: z.string().optional(),
    contact_person_id: z.string(),
    salutation: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    skype: z.string().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    is_primary_contact: z.boolean().optional(),
    is_added_in_portal: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    contact_person: ProviderContactPersonSchema
});

const OutputSchema = z
    .object({
        contact_person: z
            .object({
                contact_id: z.string().optional().describe('ID of the parent contact the person belongs to. Example: "260815000000168017"'),
                contact_person_id: z.string().describe('ID of the updated contact person. Example: "260815000000166029"'),
                salutation: z.string().optional().describe('Salutation for the contact person. Example: "Mr"'),
                first_name: z.string().optional().describe('First name of the contact person. Example: "Will"'),
                last_name: z.string().optional().describe('Last name of the contact person. Example: "Smith"'),
                email: z.string().optional().describe('Email address of the contact person. Example: "test@zylker.org"'),
                phone: z.string().optional().describe('Phone number of the contact person. Example: "1234"'),
                mobile: z.string().optional().describe('Mobile number of the contact person. Example: "9876543210"'),
                skype: z.string().optional().describe('Skype address of the contact person. Example: "zoho"'),
                designation: z.string().optional().describe('Designation of the contact person in the organization. Example: "Sales Engineer"'),
                department: z.string().optional().describe('Department the contact person belongs to. Example: "Sales"'),
                is_primary_contact: z.boolean().optional().describe('Whether this person is the primary contact person.'),
                is_added_in_portal: z.boolean().optional().describe('Whether this person has portal access.')
            })
            .describe('The updated contact person as returned by Zoho Invoice.')
    })
    .describe('Result of updating a contact person.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing contact person's details through a provider mutation.
 * @pitfalls: The API rejects is_primary_contact, so primary status cannot be changed through this action. Omitted fields are left unchanged, while passing an empty string clears them. A contact person's email only surfaces on the parent contact when that person is the primary contact person.
 */
const action = createAction({
    description: "Update an existing contact person's details.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.zoho.com/invoice/api/v3/contact-persons/#update-a-contact-person
            endpoint: `/invoice/v3/contacts/contactpersons/${encodeURIComponent(input.contact_person_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data: {
                first_name: input.first_name,
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.salutation !== undefined && { salutation: input.salutation }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.mobile !== undefined && { mobile: input.mobile }),
                ...(input.skype !== undefined && { skype: input.skype }),
                ...(input.designation !== undefined && { designation: input.designation }),
                ...(input.department !== undefined && { department: input.department })
            },
            // PUT with the same body is idempotent, so a retry cannot duplicate the mutation.
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const person = parsed.contact_person;

        return {
            contact_person: {
                ...(person.contact_id !== undefined && { contact_id: person.contact_id }),
                contact_person_id: person.contact_person_id,
                ...(person.salutation !== undefined && { salutation: person.salutation }),
                ...(person.first_name !== undefined && { first_name: person.first_name }),
                ...(person.last_name !== undefined && { last_name: person.last_name }),
                ...(person.email !== undefined && { email: person.email }),
                ...(person.phone !== undefined && { phone: person.phone }),
                ...(person.mobile !== undefined && { mobile: person.mobile }),
                ...(person.skype !== undefined && { skype: person.skype }),
                ...(person.designation !== undefined && { designation: person.designation }),
                ...(person.department !== undefined && { department: person.department }),
                ...(person.is_primary_contact !== undefined && { is_primary_contact: person.is_primary_contact }),
                ...(person.is_added_in_portal !== undefined && { is_added_in_portal: person.is_added_in_portal })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
