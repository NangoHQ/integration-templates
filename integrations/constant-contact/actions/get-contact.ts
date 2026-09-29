import { z } from 'zod';
import { createAction } from 'nango';

const INCLUDE_SUBRESOURCES = 'custom_fields,list_memberships,taggings,phone_numbers,street_addresses,notes';

const InputSchema = z
    .object({
        contact_id: z.string().describe('Unique ID of the contact to retrieve. Example: "1898ae62-4752-11e9-9c8a-fa163e6b01c1"')
    })
    .describe('Input for retrieving a single Constant Contact contact.');

const EmailAddressSchema = z.object({
    address: z.string().describe('The email address of the contact.'),
    permission_to_send: z
        .string()
        .optional()
        .describe('Permission status for sending email to this address. Known values include "implicit", "explicit" and "unsubscribed".'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the email address was added to the contact. Example: "2022-01-03T10:53:04-05:00"'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the email address was last updated.'),
    opt_in_source: z.string().optional().describe('Who opted the contact in. Known values are "Account" and "Contact".'),
    opt_in_date: z.string().optional().describe('ISO 8601 timestamp of the opt-in.'),
    opt_out_source: z.string().optional().describe('Who opted the contact out. Known values are "Account" and "Contact". Present only when unsubscribed.'),
    opt_out_date: z.string().optional().describe('ISO 8601 timestamp of the opt-out. Present only when unsubscribed.'),
    opt_out_reason: z.string().optional().describe('Reason recorded for the opt-out. Present only when unsubscribed.'),
    confirm_status: z.string().optional().describe('Confirmed opt-in status of the email address. Known values include "off" and "confirmed".')
});

const CustomFieldValueSchema = z.object({
    custom_field_id: z.string().describe('Unique ID of the account-level custom field.'),
    value: z.string().describe('The value of the custom field for this contact.')
});

const PhoneNumberSchema = z.object({
    phone_number_id: z.string().describe('Unique ID of the phone number.'),
    phone_number: z.string().describe('The phone number. Example: "555-123-4567"'),
    kind: z.string().optional().describe('The type of phone number. Known values include "home" and "mobile".'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the phone number was added.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the phone number was last updated.')
});

const StreetAddressSchema = z.object({
    street_address_id: z.string().describe('Unique ID of the street address.'),
    kind: z.string().optional().describe('The type of street address. Known values include "home".'),
    street: z.string().optional().describe('Street line of the address.'),
    city: z.string().optional().describe('City of the address.'),
    state: z.string().optional().describe('State or region of the address.'),
    postal_code: z.string().optional().describe('Postal or ZIP code of the address.'),
    country: z.string().optional().describe('Country of the address.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the street address was added.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the street address was last updated.')
});

const NoteSchema = z.object({
    note_id: z.string().optional().describe('Unique ID of the note.'),
    content: z.string().optional().describe('Text content of the note.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the note was created.')
});

const OutputSchema = z
    .object({
        contact_id: z.string().describe('Unique ID of the contact.'),
        email_address: EmailAddressSchema.optional().describe('Email address subresource of the contact. Omitted for contacts that only have an SMS address.'),
        first_name: z.string().optional().describe('First name of the contact.'),
        last_name: z.string().optional().describe('Last name of the contact.'),
        job_title: z.string().optional().describe('Job title of the contact.'),
        company_name: z.string().optional().describe('Company name of the contact.'),
        birthday_month: z.number().optional().describe('Birthday month of the contact (1-12).'),
        birthday_day: z.number().optional().describe('Birthday day of the month of the contact (1-31).'),
        anniversary: z.string().optional().describe('Anniversary date of the contact. Example: "2006-11-15"'),
        create_source: z.string().optional().describe('Who created the contact. Known values are "Account" and "Contact".'),
        update_source: z
            .string()
            .optional()
            .describe('Who last updated the contact. Known values are "Account" and "Contact". Absent if the contact has never been updated.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the contact was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the contact was last updated.'),
        deleted_at: z
            .string()
            .optional()
            .describe('Deletion date (YYYY-MM-DD) of the contact. Present only on deleted contacts, which remain retrievable by id.'),
        custom_fields: z.array(CustomFieldValueSchema).describe('Custom field values set on the contact.'),
        phone_numbers: z.array(PhoneNumberSchema).describe('Phone numbers of the contact.'),
        street_addresses: z.array(StreetAddressSchema).describe('Street addresses of the contact.'),
        list_memberships: z.array(z.string()).describe('IDs of the contact lists the contact belongs to.'),
        taggings: z.array(z.string()).describe('IDs of the tags applied to the contact.'),
        notes: z.array(NoteSchema).describe('Notes attached to the contact.')
    })
    .describe('A Constant Contact contact including its custom fields, list memberships, taggings, phone numbers, street addresses and notes.');

const ContactSchema = z.object({
    contact_id: z.string(),
    email_address: EmailAddressSchema.optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    job_title: z.string().optional(),
    company_name: z.string().optional(),
    birthday_month: z.number().optional(),
    birthday_day: z.number().optional(),
    anniversary: z.string().optional(),
    create_source: z.string().optional(),
    update_source: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted_at: z.string().optional(),
    custom_fields: z.array(CustomFieldValueSchema).optional(),
    phone_numbers: z.array(PhoneNumberSchema).optional(),
    street_addresses: z.array(StreetAddressSchema).optional(),
    list_memberships: z.array(z.string()).optional(),
    taggings: z.array(z.string()).optional(),
    notes: z.array(NoteSchema).optional()
});

/**
 * @tags: [read]
 * @tagReason: Only reads a contact from the provider; performs no provider-side mutation.
 * @pitfalls: A deleted contact is still returned successfully with a `deleted_at` date instead of failing with a not-found error, so check `deleted_at` to detect deleted contacts.
 */
const action = createAction({
    description: 'Retrieve a single contact by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html#tag/Contacts/operation/getContact
        const response = await nango.get({
            endpoint: `/v3/contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                include: INCLUDE_SUBRESOURCES
            },
            retries: 3
        });

        const contact = ContactSchema.parse(response.data);

        return {
            ...contact,
            custom_fields: contact.custom_fields ?? [],
            phone_numbers: contact.phone_numbers ?? [],
            street_addresses: contact.street_addresses ?? [],
            list_memberships: contact.list_memberships ?? [],
            taggings: contact.taggings ?? [],
            notes: contact.notes ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
