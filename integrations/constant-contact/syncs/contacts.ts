import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ContactEmailAddressSchema = z
    .object({
        address: z.string().describe("The contact's email address. Example: 'ada@example.com'"),
        permission_to_send: z
            .string()
            .optional()
            .describe("Email permission status of the address (e.g. 'implicit', 'explicit', 'not_set', 'temp_hold', 'unsubscribed')"),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the email address was added to the contact'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the email address was last modified'),
        opt_in_source: z.string().optional().describe("Who opted the contact in: 'Account' (implicit permission) or 'Contact' (explicit permission)"),
        opt_in_date: z.string().optional().describe('ISO 8601 timestamp of when the contact opted in'),
        confirm_status: z.string().optional().describe("Confirmed opt-in status of the email address (e.g. 'off', 'on', 'pending')")
    })
    .describe("The contact's primary email address with its permission and opt-in details");

const ContactCustomFieldValueSchema = z
    .object({
        custom_field_id: z.string().describe('Unique ID (UUID) of the custom field definition'),
        value: z.string().describe('Value of the custom field for this contact')
    })
    .describe('A custom field value assigned to the contact');

const ContactPhoneNumberSchema = z
    .object({
        phone_number_id: z.string().describe('Unique ID (UUID) of the phone number'),
        phone_number: z.string().describe("The contact's phone number. Example: '555-555-0100'"),
        kind: z.string().optional().describe("The type of phone number (e.g. 'home', 'work', 'mobile', 'other')"),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the phone number was added'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the phone number was last modified')
    })
    .describe('A phone number associated with the contact');

const ContactStreetAddressSchema = z
    .object({
        street_address_id: z.string().describe('Unique ID (UUID) of the street address'),
        kind: z.string().optional().describe("The type of street address (e.g. 'home', 'work', 'other')"),
        street: z.string().optional().describe('Street line of the address'),
        city: z.string().optional().describe('City of the address'),
        state: z.string().optional().describe('State or province of the address'),
        postal_code: z.string().optional().describe('Postal or ZIP code of the address'),
        country: z.string().optional().describe('Country of the address'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the street address was added'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the street address was last modified')
    })
    .describe('A street address associated with the contact');

const ContactNoteSchema = z
    .object({
        note_id: z.string().describe('Unique ID (UUID) of the note'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the note was created'),
        content: z.string().optional().describe('Text content of the note (max 2000 characters)')
    })
    .describe('A note about the contact');

const contactShape = {
    email_address: ContactEmailAddressSchema.optional().describe(
        "The contact's primary email address with its permission and opt-in details. Absent on SMS-only contacts, which have no email address."
    ),
    first_name: z.string().optional().describe("The contact's first name"),
    last_name: z.string().optional().describe("The contact's last name"),
    job_title: z.string().optional().describe("The contact's job title"),
    company_name: z.string().optional().describe('Name of the company the contact works for'),
    birthday_month: z.number().optional().describe("The contact's birthday month (1-12); always paired with birthday_day"),
    birthday_day: z.number().optional().describe("The contact's birthday day (1-31); always paired with birthday_month"),
    anniversary: z.string().optional().describe("The contact's anniversary date. Example: '2006-11-15'"),
    create_source: z.string().optional().describe("Who added the contact: 'Account' or 'Contact'"),
    update_source: z.string().optional().describe("Who last updated the contact: 'Account' or 'Contact'"),
    created_at: z.string().describe('ISO 8601 timestamp of when the contact was created'),
    updated_at: z.string().describe('ISO 8601 timestamp of when the contact was last updated'),
    custom_fields: z.array(ContactCustomFieldValueSchema).optional().describe('Custom field values assigned to the contact (up to 25)'),
    list_memberships: z
        .array(z.string().describe('Unique ID (UUID) of a contact list'))
        .optional()
        .describe('IDs of the contact lists the contact belongs to (up to 50)'),
    taggings: z.array(z.string().describe('Unique ID (UUID) of a tag')).optional().describe('IDs of the tags applied to the contact (up to 50)'),
    phone_numbers: z.array(ContactPhoneNumberSchema).optional().describe('Phone numbers associated with the contact (up to 3)'),
    street_addresses: z.array(ContactStreetAddressSchema).optional().describe('Street addresses associated with the contact (up to 3)'),
    notes: z.array(ContactNoteSchema).optional().describe('Notes about the contact, most recent first (up to 150)')
};

const ContactSchema = z
    .object({
        id: z.string().describe("Unique ID (UUID) of the contact, mapped from Constant Contact's contact_id"),
        ...contactShape
    })
    .describe(
        'A Constant Contact contact with its email permission details and subresources (custom fields, list memberships, tags, phone numbers, street addresses, notes)'
    );

// Internal schema for parsing GET /v3/contacts response records; same fields as the Contact model plus the provider's contact_id.
const ProviderContactSchema = z.object({
    contact_id: z.string(),
    ...contactShape
});

const CheckpointSchema = z.object({
    updated_after: z
        .string()
        .describe(
            "ISO 8601 timestamp of the most recently updated contact seen so far; sent as the 'updated_after' filter on the next incremental run. An empty string means no contact has been seen yet."
        ),
    runs_since_full_refresh: z
        .number()
        .describe(
            'Number of incremental runs completed since the last full delete-tracked refresh; a full refresh is forced when this reaches the configured interval.'
        )
});

// Deleted contacts leave no tombstone that an updated_after filter could pick up, so a full
// delete-tracked crawl runs when there is no checkpoint and every 24 incremental runs
// (once a day at the hourly frequency) afterwards.
const FULL_REFRESH_INTERVAL = 24;

const sync = createSync({
    description:
        'Sync contacts from Constant Contact with email permissions, list memberships, tags, phone numbers, street addresses, notes, and custom field values.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['contact_data'],
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const rawCheckpoint: unknown = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : undefined;

        const runsSinceFullRefresh = checkpoint?.runs_since_full_refresh ?? 0;
        const isFullRefresh = !checkpoint || checkpoint.updated_after === '' || runsSinceFullRefresh >= FULL_REFRESH_INTERVAL;
        let deleteTrackingStarted = false;

        const proxyConfig: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/contacts',
            params: {
                include: 'custom_fields,list_memberships,taggings,phone_numbers,street_addresses,notes',
                ...(!isFullRefresh && checkpoint ? { updated_after: checkpoint.updated_after } : {})
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: '_links.next.href',
                response_path: 'contacts',
                limit_name_in_request: 'limit',
                limit: 500
            },
            retries: 3
        };

        let maxUpdatedAt: string | undefined;
        let maxUpdatedAtMs: number | undefined;

        for await (const batch of nango.paginate<unknown>(proxyConfig)) {
            if (!Array.isArray(batch)) {
                throw new Error('Unexpected response shape from GET /v3/contacts: expected an array of contacts');
            }

            const contacts: z.infer<typeof ContactSchema>[] = [];
            for (const rawContact of batch) {
                const parsed = ProviderContactSchema.safeParse(rawContact);
                if (!parsed.success) {
                    // Throwing is required here: inside a delete-tracked full refresh a skipped
                    // record would be falsely reported as deleted when trackDeletesEnd runs.
                    throw new Error(`Failed to parse Constant Contact contact: ${parsed.error.message}`);
                }
                const { contact_id, ...fields } = parsed.data;
                contacts.push({ id: contact_id, ...fields });
            }

            // Only start delete tracking once this page's records have passed validation above,
            // so a parsing failure on the first page never leaves an open tracking window.
            if (isFullRefresh && !deleteTrackingStarted) {
                await nango.trackDeletesStart('Contact');
                deleteTrackingStarted = true;
            }

            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');
            }

            for (const contact of contacts) {
                const updatedAtMs = Date.parse(contact.updated_at);
                if (!Number.isNaN(updatedAtMs) && (maxUpdatedAtMs === undefined || updatedAtMs > maxUpdatedAtMs)) {
                    maxUpdatedAtMs = updatedAtMs;
                    maxUpdatedAt = contact.updated_at;
                }
            }
        }

        if (deleteTrackingStarted) {
            await nango.trackDeletesEnd('Contact');
        }

        await nango.saveCheckpoint({
            updated_after: maxUpdatedAt ?? checkpoint?.updated_after ?? '',
            runs_since_full_refresh: isFullRefresh ? 0 : runsSinceFullRefresh + 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
