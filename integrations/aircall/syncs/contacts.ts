import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AircallPhoneNumberSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string()
});

const AircallEmailSchema = z.object({
    id: z.number(),
    label: z.string(),
    value: z.string()
});

const AircallContactSchema = z.object({
    id: z.number(),
    direct_link: z.string().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    information: z.string().nullable().optional(),
    is_shared: z.boolean().optional(),
    created_at: z.number(),
    updated_at: z.number(),
    emails: z.array(AircallEmailSchema).optional(),
    phone_numbers: z.array(AircallPhoneNumberSchema).optional()
});

const ContactSchema = z.object({
    id: z.string(),
    direct_link: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    description: z.string().optional(),
    information: z.string().optional(),
    is_shared: z.boolean().optional(),
    created_at: z.number(),
    updated_at: z.number(),
    emails: z.array(AircallEmailSchema).optional(),
    phone_numbers: z.array(AircallPhoneNumberSchema).optional()
});

const sync = createSync({
    description: 'Sync contacts from Aircall.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Contact: ContactSchema
    },
    endpoints: [
        {
            path: '/syncs/contacts',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        await nango.trackDeletesStart('Contact');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-all-contacts
            endpoint: '/v1/contacts',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'meta.next_page_link',
                response_path: 'contacts',
                limit_name_in_request: 'per_page',
                limit: 50
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const rawContacts = z.array(AircallContactSchema).parse(batch);

            const contacts = rawContacts.map((contact) => ({
                id: String(contact.id),
                ...(contact.direct_link !== undefined && { direct_link: contact.direct_link }),
                ...(contact.first_name != null && { first_name: contact.first_name }),
                ...(contact.last_name != null && { last_name: contact.last_name }),
                ...(contact.company_name != null && { company_name: contact.company_name }),
                ...(contact.description != null && { description: contact.description }),
                ...(contact.information != null && { information: contact.information }),
                ...(contact.is_shared !== undefined && { is_shared: contact.is_shared }),
                created_at: contact.created_at,
                updated_at: contact.updated_at,
                ...(contact.emails !== undefined && { emails: contact.emails }),
                ...(contact.phone_numbers !== undefined && { phone_numbers: contact.phone_numbers })
            }));

            if (contacts.length > 0) {
                await nango.batchSave(contacts, 'Contact');
            }
        }

        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
