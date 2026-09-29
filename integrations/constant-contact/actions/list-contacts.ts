import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        email: z.string().optional().describe('Return only the contact with this exact email address. Example: "ada@example.com"'),
        list_membership: z
            .string()
            .optional()
            .describe('Return only contacts that are members of the contact list with this ID. Example: "c3639a04-bc12-11f1-aa3a-02420a320002"'),
        status: z
            .enum(['all', 'active', 'unsubscribed', 'implicit', 'explicit'])
            .optional()
            .describe('Filter contacts by status. "all" additionally returns soft-deleted contacts.'),
        segment_id: z.string().optional().describe('Return only contacts that belong to the segment with this ID.'),
        tags: z.array(z.string()).optional().describe('Return only contacts tagged with these tag IDs.'),
        updated_after: z.string().optional().describe('ISO 8601 timestamp; return only contacts updated after this time. Example: "2026-01-01T00:00:00Z"'),
        updated_before: z.string().optional().describe('ISO 8601 timestamp; return only contacts updated before this time. Example: "2026-12-31T23:59:59Z"'),
        include: z
            .array(z.enum(['custom_fields', 'list_memberships', 'taggings', 'phone_numbers', 'street_addresses', 'notes']))
            .optional()
            .describe('Sub-resources to embed in each returned contact. Omitted sub-resources are not returned at all.'),
        limit: z.number().int().min(1).max(500).optional().describe('Maximum number of contacts to return per page. The API rejects values above 500.'),
        cursor: z.string().optional().describe('Pagination cursor from a previous response next_cursor. Omit for the first page.')
    })
    .describe('Filters for listing contacts. Every field is optional; combine them to narrow the result set.');

const EmailAddressSchema = z.object({
    address: z.string().describe('The contact email address.'),
    permission_to_send: z.string().optional().describe('Email permission status, such as implicit, explicit, or unsubscribed.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the email address was added.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the email address was last updated.'),
    opt_in_source: z.string().optional().describe('Who opted the contact in: Account or Contact.'),
    opt_in_date: z.string().optional().describe('ISO 8601 timestamp of the opt-in.'),
    confirm_status: z.string().optional().describe('Confirmed-opt-in status of the email address.')
});

const CustomFieldValueSchema = z.object({
    custom_field_id: z.string().describe('ID of the custom field.'),
    value: z.string().describe('Value stored for the custom field on this contact.')
});

const PhoneNumberSchema = z.object({
    phone_number_id: z.string().describe('ID of the phone number record.'),
    phone_number: z.string().optional().describe('The phone number.'),
    kind: z.string().optional().describe('Phone number kind, such as home, work, or mobile.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the phone number was added.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the phone number was last updated.')
});

const StreetAddressSchema = z.object({
    street_address_id: z.string().describe('ID of the street address record.'),
    kind: z.string().optional().describe('Address kind, such as home, work, or other.'),
    street: z.string().optional().describe('Street line of the address.'),
    city: z.string().optional().describe('City of the address.'),
    state: z.string().optional().describe('State or region of the address. May be a full name rather than a code.'),
    postal_code: z.string().optional().describe('Postal code of the address.'),
    country: z.string().optional().describe('Country of the address. May be a full name rather than a code.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the address was added.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the address was last updated.')
});

const NoteSchema = z.object({
    note_id: z.string().describe('ID of the note.'),
    content: z.string().describe('Text content of the note.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the note was added.')
});

const ContactSchema = z.object({
    contact_id: z.string().describe('Unique ID of the contact.'),
    email_address: EmailAddressSchema.optional().describe('Primary email address and its permission details.'),
    first_name: z.string().optional().describe('First name of the contact.'),
    last_name: z.string().optional().describe('Last name of the contact.'),
    job_title: z.string().optional().describe('Job title of the contact.'),
    company_name: z.string().optional().describe('Company name of the contact.'),
    birthday_month: z.number().optional().describe('Birthday month of the contact (1-12).'),
    birthday_day: z.number().optional().describe('Birthday day of the contact (1-31).'),
    anniversary: z.string().optional().describe('Anniversary date of the contact.'),
    create_source: z.string().optional().describe('Who created the contact: Account or Contact.'),
    update_source: z.string().optional().describe('Who last updated the contact: Account or Contact.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the contact was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the contact was last updated.'),
    deleted_at: z.string().optional().describe('ISO 8601 timestamp when the contact was deleted. Present only on soft-deleted contacts.'),
    custom_fields: z.array(CustomFieldValueSchema).optional().describe('Custom field values. Returned only when requested via include.'),
    phone_numbers: z.array(PhoneNumberSchema).optional().describe('Phone numbers. Returned only when requested via include.'),
    street_addresses: z.array(StreetAddressSchema).optional().describe('Street addresses. Returned only when requested via include.'),
    list_memberships: z.array(z.string()).optional().describe('IDs of the contact lists this contact belongs to. Returned only when requested via include.'),
    taggings: z.array(z.string()).optional().describe('IDs of the tags applied to this contact. Returned only when requested via include.'),
    notes: z.array(NoteSchema).optional().describe('Notes attached to this contact. Returned only when requested via include.')
});

const OutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('Contacts matching the filters, for the current page.'),
        next_cursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page. Absent when there are no more pages.')
    })
    .describe('One page of contacts plus the cursor for the next page.');

const ContactsResponseSchema = z.object({
    contacts: z.array(ContactSchema),
    _links: z
        .object({
            next: z.object({ href: z.string() }).optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Only reads contacts from the provider with a GET request; it creates, updates, or deletes nothing.
 * @pitfalls: Sub-resources (custom_fields, list_memberships, taggings, phone_numbers, street_addresses, notes) are returned only when requested via include. Unsubscribed contacts still appear in the default listing; pass status to narrow results. Status "all" additionally returns soft-deleted contacts, identifiable by deleted_at.
 */
const action = createAction({
    description: 'List contacts, optionally filtered by list membership, email, or update time.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html (GET /v3/contacts)
            endpoint: '/v3/contacts',
            params: {
                ...(input.email !== undefined && { email: input.email }),
                ...(input.list_membership !== undefined && { list_membership: input.list_membership }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.segment_id !== undefined && { segment_id: input.segment_id }),
                ...(input.tags !== undefined && input.tags.length > 0 && { tags: input.tags.join(',') }),
                ...(input.updated_after !== undefined && { updated_after: input.updated_after }),
                ...(input.updated_before !== undefined && { updated_before: input.updated_before }),
                ...(input.include !== undefined && input.include.length > 0 && { include: input.include.join(',') }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ContactsResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        const nextHref = parsed._links?.next?.href;
        if (nextHref) {
            const queryString = nextHref.split('?')[1];
            if (queryString) {
                const cursorParam = new URLSearchParams(queryString).get('cursor');
                if (cursorParam) {
                    nextCursor = cursorParam;
                }
            }
        }

        return {
            contacts: parsed.contacts,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
