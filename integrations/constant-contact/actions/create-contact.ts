import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        email_address: z
            .object({
                address: z.string().describe('The email address of the contact. Example: "jane.doe@example.com"')
            })
            .describe('The contact email address object.'),
        first_name: z.string().optional().describe('The first name of the contact. Example: "Jane"'),
        last_name: z.string().optional().describe('The last name of the contact. Example: "Doe"'),
        job_title: z.string().optional().describe('The job title of the contact. Example: "Marketing Manager"'),
        company_name: z.string().optional().describe('The company name of the contact. Example: "Acme Corp"'),
        birthday_month: z.number().int().min(1).max(12).optional().describe("The month of the contact's birthday, 1-12. Always pair with birthday_day."),
        birthday_day: z.number().int().min(1).max(31).optional().describe("The day of the contact's birthday, 1-31. Always pair with birthday_month."),
        anniversary: z.string().optional().describe('The anniversary date of the contact, in YYYY-MM-DD format. Example: "2020-06-14"'),
        phone_numbers: z
            .array(
                z.object({
                    phone_number: z.string().describe('The phone number of the contact. Example: "555-555-0100"'),
                    kind: z.enum(['home', 'work', 'mobile', 'other']).optional().describe('The kind of phone number. Example: "work"')
                })
            )
            .optional()
            .describe('The phone numbers of the contact.'),
        street_addresses: z
            .array(
                z.object({
                    kind: z.enum(['home', 'work', 'other']).optional().describe('The kind of street address. Example: "home"'),
                    street: z.string().optional().describe('The street of the address. Example: "1 Main St"'),
                    city: z.string().optional().describe('The city of the address. Example: "Springfield"'),
                    state: z.string().optional().describe('The state or province of the address. Example: "IL"'),
                    postal_code: z.string().optional().describe('The postal code of the address. Example: "62701"'),
                    country: z.string().optional().describe('The country of the address. Example: "US"')
                })
            )
            .optional()
            .describe('The street addresses of the contact.'),
        list_memberships: z
            .array(z.string().describe('The ID of a contact list. Example: "c3639a04-bc12-11f1-aa3a-02420a320002"'))
            .optional()
            .describe('The IDs of the contact lists the contact belongs to.'),
        custom_fields: z
            .array(
                z.object({
                    custom_field_id: z.string().describe('The ID of the custom field. Example: "a1b2c3d4-bc12-11f1-aa3a-02420a320002"'),
                    value: z.string().describe('The value of the custom field. Example: "Gold"')
                })
            )
            .optional()
            .describe('The custom field values of the contact.'),
        taggings: z
            .array(z.string().describe('The ID of a tag. Example: "b2c3d4e5-bc12-11f1-aa3a-02420a320002"'))
            .optional()
            .describe('The IDs of the tags applied to the contact, as a plain array of tag ID strings.'),
        create_source: z
            .enum(['Account', 'Contact'])
            .describe(
                'Identifies who added the contact. Use "Account" when the business adds the contact (results in implicit email permission) or "Contact" when the contact opted in themselves (results in explicit email permission). Example: "Contact"'
            )
    })
    .describe('The contact to create in the Constant Contact account.');

const OutputSchema = z
    .object({
        contact_id: z.string().describe('The unique ID of the contact. Example: "9e6c34dc-bc34-11f1-8496-02420a320002"'),
        email_address: z
            .object({
                address: z.string().describe('The email address of the contact. Example: "jane.doe@example.com"'),
                permission_to_send: z
                    .string()
                    .optional()
                    .describe('The email permission status of the contact, derived from create_source. Example: "explicit"'),
                created_at: z.string().optional().describe('The date and time the email address was added, in ISO-8601 format.'),
                updated_at: z.string().optional().describe('The date and time the email address was last updated, in ISO-8601 format.'),
                opt_in_source: z.string().optional().describe('The opt-in source of the email address, mirroring create_source. Example: "Contact"'),
                opt_in_date: z.string().optional().describe('The date and time the contact opted in, in ISO-8601 format.'),
                confirm_status: z.string().optional().describe('The confirmation status of the contact email address. Example: "off"')
            })
            .describe('The email address details of the contact.'),
        first_name: z.string().optional().describe('The first name of the contact. Example: "Jane"'),
        last_name: z.string().optional().describe('The last name of the contact. Example: "Doe"'),
        job_title: z.string().optional().describe('The job title of the contact. Example: "Marketing Manager"'),
        company_name: z.string().optional().describe('The company name of the contact. Example: "Acme Corp"'),
        birthday_month: z.number().optional().describe("The month of the contact's birthday, when set."),
        birthday_day: z.number().optional().describe("The day of the contact's birthday, when set."),
        anniversary: z.string().optional().describe('The anniversary date of the contact, when set.'),
        create_source: z.string().optional().describe('Identifies who added the contact. Example: "Contact"'),
        created_at: z.string().optional().describe('The date and time the contact was created, in ISO-8601 format.'),
        updated_at: z.string().optional().describe('The date and time the contact was last updated, in ISO-8601 format.'),
        phone_numbers: z
            .array(
                z.object({
                    phone_number_id: z.string().optional().describe('The unique ID of the phone number. Example: "a5b2c242-bc34-11f1-8496-02420a320002"'),
                    phone_number: z.string().optional().describe('The phone number of the contact. Example: "555-555-0100"'),
                    kind: z.string().optional().describe('The kind of phone number. Example: "work"'),
                    created_at: z.string().optional().describe('The date and time the phone number was added, in ISO-8601 format.'),
                    updated_at: z.string().optional().describe('The date and time the phone number was last updated, in ISO-8601 format.')
                })
            )
            .optional()
            .describe('The phone numbers of the contact.'),
        street_addresses: z
            .array(
                z.object({
                    street_address_id: z.string().optional().describe('The unique ID of the street address. Example: "a5b34190-bc34-11f1-8496-02420a320002"'),
                    kind: z.string().optional().describe('The kind of street address. Example: "work"'),
                    street: z.string().optional().describe('The street of the address. Example: "1 Main St"'),
                    city: z.string().optional().describe('The city of the address. Example: "Springfield"'),
                    state: z.string().optional().describe('The state or province of the address. Example: "IL"'),
                    postal_code: z.string().optional().describe('The postal code of the address. Example: "62701"'),
                    country: z.string().optional().describe('The country of the address. Example: "US"'),
                    created_at: z.string().optional().describe('The date and time the street address was added, in ISO-8601 format.'),
                    updated_at: z.string().optional().describe('The date and time the street address was last updated, in ISO-8601 format.')
                })
            )
            .optional()
            .describe('The street addresses of the contact.'),
        list_memberships: z
            .array(z.string().describe('The ID of a contact list. Example: "c3639a04-bc12-11f1-aa3a-02420a320002"'))
            .optional()
            .describe('The IDs of the contact lists the contact belongs to.'),
        custom_fields: z
            .array(
                z.object({
                    custom_field_id: z.string().describe('The ID of the custom field. Example: "a1b2c3d4-bc12-11f1-aa3a-02420a320002"'),
                    value: z.string().describe('The value of the custom field. Example: "Gold"')
                })
            )
            .optional()
            .describe('The custom field values of the contact.'),
        taggings: z
            .array(z.string().describe('The ID of a tag. Example: "b2c3d4e5-bc12-11f1-aa3a-02420a320002"'))
            .optional()
            .describe('The IDs of the tags applied to the contact.')
    })
    .describe('The created Constant Contact contact.');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact in the Constant Contact account.
 * @pitfalls: create_source also sets the email's permission_to_send status ("Account" -> implicit, "Contact" -> explicit), so forms where the contact opted in themselves should pass "Contact". Reusing an email that already exists on another contact fails with a 409 conflict instead of upserting. The provider expands state and country codes in the returned contact (e.g. "IL" -> "Illinois", "US" -> "United States").
 */
const action = createAction({
    description: 'Create a contact via the standard authenticated contacts API (full field set, explicit create_source).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/contacts',
            data: {
                email_address: input.email_address,
                create_source: input.create_source,
                ...(input.first_name !== undefined && { first_name: input.first_name }),
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.job_title !== undefined && { job_title: input.job_title }),
                ...(input.company_name !== undefined && { company_name: input.company_name }),
                ...(input.birthday_month !== undefined && { birthday_month: input.birthday_month }),
                ...(input.birthday_day !== undefined && { birthday_day: input.birthday_day }),
                ...(input.anniversary !== undefined && { anniversary: input.anniversary }),
                ...(input.phone_numbers !== undefined && { phone_numbers: input.phone_numbers }),
                ...(input.street_addresses !== undefined && { street_addresses: input.street_addresses }),
                ...(input.list_memberships !== undefined && { list_memberships: input.list_memberships }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
                ...(input.taggings !== undefined && { taggings: input.taggings })
            },
            // Creating a contact is not idempotent (a repeated call fails with a 409 email-exists conflict), so do not retry.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
