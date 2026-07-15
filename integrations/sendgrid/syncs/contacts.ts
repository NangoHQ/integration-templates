import { createSync, type ProxyConfiguration } from 'nango';
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
    description: 'Sync contacts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        // Blocker: GET /v3/marketing/contacts ignores page_size/page_token and always returns
        // a small capped batch. POST /v3/marketing/contacts/search rejects page_size entirely.
        // Neither endpoint offers real pagination or an updated_after filter. The only bulk
        // mechanism is the async Contacts Export job, which is out of scope per the binary-
        // download restriction.
        await nango.trackDeletesStart('Contact');

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/contacts/get-sample-contacts
            endpoint: '/v3/marketing/contacts',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_token',
                cursor_path_in_response: 'next_page_token',
                response_path: 'result',
                limit: 50,
                limit_name_in_request: 'page_size'
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const contacts = page.map((record: unknown) => {
                const parsed = ProviderContactSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse contact: ${parsed.error.message}`);
                }
                const contact = parsed.data;
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

        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
