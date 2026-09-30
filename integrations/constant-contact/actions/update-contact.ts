import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const EmailAddressInputSchema = z
    .object({
        address: z.string().describe('Email address of the contact. Example: "jane@example.com"'),
        permission_to_send: z
            .enum(['implicit', 'explicit'])
            .optional()
            .describe(
                "Email permission to set for the address. Omit to keep the contact's current permission; the API rejects downgrading an explicit permission to implicit."
            )
    })
    .describe('Email address of the contact. The API requires an email address on every contact update.');

const PhoneNumberInputSchema = z
    .object({
        phone_number: z.string().describe('Phone number of the contact. Example: "+1-555-0100"'),
        kind: z.enum(['home', 'work', 'mobile', 'other']).optional().describe('Type of the phone number.')
    })
    .describe('Phone number to set on the contact.');

const StreetAddressInputSchema = z
    .object({
        kind: z.enum(['home', 'work', 'other']).describe('Type of the street address.'),
        street: z.string().optional().describe('Street line of the address. Example: "1 Market St"'),
        city: z.string().optional().describe('City of the address.'),
        state: z.string().optional().describe('State or province of the address.'),
        postal_code: z.string().optional().describe('Postal code of the address.'),
        country: z.string().optional().describe('Country of the address.')
    })
    .describe('Street address to set on the contact.');

const CustomFieldInputSchema = z
    .object({
        custom_field_id: z.string().describe('ID of the custom field to set. Example: "4f06ba9c-bc35-11f1-bccd-02420a320002"'),
        value: z.string().describe('Value to store in the custom field. Example: "gold-tier"')
    })
    .describe('Custom field value to set on the contact.');

const InputSchema = z
    .object({
        contact_id: z.string().describe('ID of the contact to update. Example: "c36c8dda-bc12-11f1-aa3a-02420a320002"'),
        update_source: z
            .enum(['Account', 'Contact'])
            .describe(
                'Who is performing the update: "Contact" when the contact themselves requested the change, "Account" when the account owner did. Required by the API.'
            ),
        email_address: EmailAddressInputSchema,
        first_name: z
            .string()
            .optional()
            .describe(
                'First name of the contact. Omitted scalar fields are cleared by this full-replace endpoint, so resend existing values you want to keep.'
            ),
        last_name: z
            .string()
            .optional()
            .describe('Last name of the contact. Omitted scalar fields are cleared by this full-replace endpoint, so resend existing values you want to keep.'),
        job_title: z
            .string()
            .optional()
            .describe('Job title of the contact. Omitted scalar fields are cleared by this full-replace endpoint, so resend existing values you want to keep.'),
        company_name: z
            .string()
            .optional()
            .describe(
                'Company name of the contact. Omitted scalar fields are cleared by this full-replace endpoint, so resend existing values you want to keep.'
            ),
        birthday_day: z.number().int().min(1).max(31).optional().describe("Day of the contact's birthday, 1-31. Cleared when omitted."),
        birthday_month: z.number().int().min(1).max(12).optional().describe("Month of the contact's birthday, 1-12. Cleared when omitted."),
        anniversary: z.string().optional().describe('Anniversary date of the contact in YYYY-MM-DD format. Example: "2020-06-14". Cleared when omitted.'),
        phone_numbers: z
            .array(PhoneNumberInputSchema)
            .optional()
            .describe('Phone numbers of the contact. Omit to leave existing phone numbers unchanged; send [] to remove all phone numbers.'),
        street_addresses: z
            .array(StreetAddressInputSchema)
            .optional()
            .describe('Street addresses of the contact. Omit to leave existing street addresses unchanged; send [] to remove all street addresses.'),
        custom_fields: z
            .array(CustomFieldInputSchema)
            .optional()
            .describe('Custom field values of the contact. Omit to leave existing custom field values unchanged; send [] to clear all custom field values.'),
        list_memberships: z
            .array(z.string().describe('ID of a contact list. Example: "c3639a04-bc12-11f1-aa3a-02420a320002"'))
            .optional()
            .describe('IDs of the contact lists the contact belongs to. Omit to leave memberships unchanged; send [] to remove the contact from all lists.'),
        taggings: z
            .array(z.string().describe('ID of a tag. Example: "4ea9217a-bc35-11f1-9faa-02420a320002"'))
            .optional()
            .describe('IDs of the tags applied to the contact, as a plain array of tag ID strings. Omit to leave tags unchanged; send [] to remove all tags.')
    })
    .describe(
        'New state for the contact. This endpoint performs a full replace: omitted scalar fields are cleared, while omitted array fields (phone_numbers, street_addresses, custom_fields, list_memberships, taggings) are left unchanged.'
    );

const EmailAddressOutputSchema = z
    .object({
        address: z.string().describe('Email address of the contact.'),
        permission_to_send: z.string().describe('Email permission status of the address, e.g. "implicit" or "explicit".'),
        created_at: z.string().describe('ISO 8601 timestamp of when the email address was added to the contact.'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the email address was last updated.'),
        opt_in_source: z
            .string()
            .nullable()
            .optional()
            .describe('Source that opted in the email address ("Account" or "Contact"); null when the address was never opted in.'),
        opt_in_date: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of when the email address opted in; null when the address was never opted in.'),
        confirm_status: z.string().optional().describe('Confirmation status of the email address, e.g. "off".')
    })
    .describe('Email address details of the contact.');

const PhoneNumberOutputSchema = z
    .object({
        phone_number_id: z.string().describe('Unique ID of the phone number record.'),
        phone_number: z.string().describe('Phone number of the contact.'),
        kind: z.string().describe('Type of the phone number, e.g. "home", "work", "mobile" or "other".'),
        created_at: z.string().describe('ISO 8601 timestamp of when the phone number was added.'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the phone number was last updated.')
    })
    .describe('Phone number stored on the contact.');

const StreetAddressOutputSchema = z
    .object({
        street_address_id: z.string().describe('Unique ID of the street address record.'),
        kind: z.string().describe('Type of the street address, e.g. "home", "work" or "other".'),
        street: z.string().optional().describe('Street line of the address.'),
        city: z.string().optional().describe('City of the address.'),
        state: z.string().optional().describe('State or province of the address.'),
        postal_code: z.string().optional().describe('Postal code of the address.'),
        country: z.string().optional().describe('Country of the address.'),
        created_at: z.string().describe('ISO 8601 timestamp of when the street address was added.'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the street address was last updated.')
    })
    .describe('Street address stored on the contact.');

const CustomFieldOutputSchema = z
    .object({
        custom_field_id: z.string().describe('ID of the custom field.'),
        value: z.string().describe('Value stored in the custom field.')
    })
    .describe('Custom field value stored on the contact.');

const OutputSchema = z
    .object({
        contact_id: z.string().describe('Unique ID of the contact.'),
        email_address: EmailAddressOutputSchema,
        first_name: z.string().optional().describe('First name of the contact, when set.'),
        last_name: z.string().optional().describe('Last name of the contact, when set.'),
        job_title: z.string().optional().describe('Job title of the contact, when set.'),
        company_name: z.string().optional().describe('Company name of the contact, when set.'),
        birthday_day: z.number().optional().describe("Day of the contact's birthday, when set."),
        birthday_month: z.number().optional().describe("Month of the contact's birthday, when set."),
        anniversary: z.string().optional().describe('Anniversary date of the contact, when set.'),
        create_source: z.string().describe('Source that originally created the contact ("Account" or "Contact").'),
        update_source: z.string().describe('Source recorded for the last update of the contact ("Account" or "Contact").'),
        created_at: z.string().describe('ISO 8601 timestamp of when the contact was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the contact was last updated.'),
        custom_fields: z.array(CustomFieldOutputSchema).optional().describe('Custom field values stored on the contact.'),
        phone_numbers: z.array(PhoneNumberOutputSchema).optional().describe('Phone numbers stored on the contact.'),
        street_addresses: z.array(StreetAddressOutputSchema).optional().describe('Street addresses stored on the contact.'),
        list_memberships: z.array(z.string().describe('ID of a contact list.')).optional().describe('IDs of the contact lists the contact belongs to.'),
        taggings: z.array(z.string().describe('ID of a tag.')).optional().describe('IDs of the tags applied to the contact.')
    })
    .describe(
        'The updated contact. Constant Contact echoes back the fields included in the update request alongside the core contact fields, so fields not sent in the request may be absent even when set on the contact.'
    );

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates an existing contact through the provider's update endpoint, and its full-replace semantics silently clear omitted scalar fields and replace tag and list-membership sets, which is difficult to reverse.
 * @pitfalls: Full replace, not a merge: omitted scalar fields (first_name, last_name, job_title, company_name, birthday, anniversary) are silently cleared, so resend the contact's full desired state; omitted array fields (phone_numbers, street_addresses, custom_fields, list_memberships, taggings) are left unchanged, and sending [] clears them. The response echoes only the fields sent in the request plus core contact fields, so set fields not included in the call are absent from the output. The API rejects downgrading an explicit email permission to implicit, and expands abbreviated street-address state and country values to their full names.
 */
const action = createAction({
    description: "Update a contact's fields, including list memberships, tags, and custom fields (full-replace semantics).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: `/v3/contacts/${encodeURIComponent(input.contact_id)}`,
            retries: 3,
            data: {
                update_source: input.update_source,
                email_address: input.email_address,
                ...(input.first_name !== undefined && { first_name: input.first_name }),
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.job_title !== undefined && { job_title: input.job_title }),
                ...(input.company_name !== undefined && { company_name: input.company_name }),
                ...(input.birthday_day !== undefined && { birthday_day: input.birthday_day }),
                ...(input.birthday_month !== undefined && { birthday_month: input.birthday_month }),
                ...(input.anniversary !== undefined && { anniversary: input.anniversary }),
                ...(input.phone_numbers !== undefined && { phone_numbers: input.phone_numbers }),
                ...(input.street_addresses !== undefined && { street_addresses: input.street_addresses }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
                ...(input.list_memberships !== undefined && { list_memberships: input.list_memberships }),
                ...(input.taggings !== undefined && { taggings: input.taggings })
            }
        };

        const response = await nango.put(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
