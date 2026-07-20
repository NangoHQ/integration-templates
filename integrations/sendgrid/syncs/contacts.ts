import { createSync } from 'nango';
import { z } from 'zod';

const ProviderContactSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    unique_name: z.string().optional(),
    email: z.string().optional(),
    phone_number_id: z.string().optional(),
    external_id: z.string().optional(),
    anonymous_id: z.string().optional(),
    alternate_emails: z.array(z.string()).nullable().optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    city: z.string().optional(),
    state_province_region: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
    phone_number: z.string().optional(),
    whatsapp: z.string().optional(),
    line: z.string().optional(),
    facebook: z.string().optional(),
    list_ids: z.array(z.string()).nullable().optional(),
    segment_ids: z.array(z.string()).nullable().optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ContactSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    unique_name: z.string().optional(),
    email: z.string().optional(),
    phone_number_id: z.string().optional(),
    external_id: z.string().optional(),
    anonymous_id: z.string().optional(),
    alternate_emails: z.array(z.string()).optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    city: z.string().optional(),
    state_province_region: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
    phone_number: z.string().optional(),
    whatsapp: z.string().optional(),
    line: z.string().optional(),
    facebook: z.string().optional(),
    list_ids: z.array(z.string()).optional(),
    segment_ids: z.array(z.string()).optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description:
        'Sync a sample of contacts. SendGrid does not offer a paginated or full-export-capable ' +
        'contacts listing endpoint usable here, so this sync only reflects the small recent-contacts sample ' +
        'the API returns and never deletes previously synced records.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v3/marketing/contacts ignores page_size/page_token (verified live) and always
        // returns a small capped batch with no next-page cursor. POST /v3/marketing/contacts/search
        // rejects page_size entirely. Neither endpoint offers real pagination or an updated_after filter,
        // so full enumeration isn't possible here. Delete tracking is intentionally NOT used: treating
        // this partial sample as the full dataset would incorrectly mark untouched contacts as deleted.
        const response = await nango.get({
            // https://www.twilio.com/docs/sendgrid/api-reference/contacts/get-sample-contacts
            endpoint: '/v3/marketing/contacts',
            retries: 3
        });

        const parsed = z.object({ result: z.array(z.unknown()) }).parse(response.data);

        const contacts = parsed.result.map((record: unknown) => {
            const contactParsed = ProviderContactSchema.safeParse(record);
            if (!contactParsed.success) {
                throw new Error(`Failed to parse contact: ${contactParsed.error.message}`);
            }
            const contact = contactParsed.data;
            return {
                id: contact.id,
                ...(contact.first_name !== undefined && { first_name: contact.first_name }),
                ...(contact.last_name !== undefined && { last_name: contact.last_name }),
                ...(contact.unique_name !== undefined && { unique_name: contact.unique_name }),
                ...(contact.email !== undefined && { email: contact.email }),
                ...(contact.phone_number_id !== undefined && { phone_number_id: contact.phone_number_id }),
                ...(contact.external_id !== undefined && { external_id: contact.external_id }),
                ...(contact.anonymous_id !== undefined && { anonymous_id: contact.anonymous_id }),
                ...(contact.alternate_emails != null && { alternate_emails: contact.alternate_emails }),
                ...(contact.address_line_1 !== undefined && { address_line_1: contact.address_line_1 }),
                ...(contact.address_line_2 !== undefined && { address_line_2: contact.address_line_2 }),
                ...(contact.city !== undefined && { city: contact.city }),
                ...(contact.state_province_region !== undefined && { state_province_region: contact.state_province_region }),
                ...(contact.country !== undefined && { country: contact.country }),
                ...(contact.postal_code !== undefined && { postal_code: contact.postal_code }),
                ...(contact.phone_number !== undefined && { phone_number: contact.phone_number }),
                ...(contact.whatsapp !== undefined && { whatsapp: contact.whatsapp }),
                ...(contact.line !== undefined && { line: contact.line }),
                ...(contact.facebook !== undefined && { facebook: contact.facebook }),
                ...(contact.list_ids != null && { list_ids: contact.list_ids }),
                ...(contact.segment_ids != null && { segment_ids: contact.segment_ids }),
                ...(contact.custom_fields != null && { custom_fields: contact.custom_fields }),
                ...(contact.created_at !== undefined && { created_at: contact.created_at }),
                ...(contact.updated_at !== undefined && { updated_at: contact.updated_at })
            };
        });

        if (contacts.length > 0) {
            await nango.batchSave(contacts, 'Contact');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
