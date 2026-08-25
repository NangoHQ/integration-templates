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

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync contacts from Aircall.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
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
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = rawCheckpoint == null ? null : CheckpointSchema.safeParse(rawCheckpoint);
        if (checkpointParse != null && !checkpointParse.success) {
            throw new Error(`Invalid checkpoint: ${checkpointParse.error.message}`);
        }
        const checkpoint = checkpointParse?.data ?? null;
        let currentPage: number = checkpoint?.page ?? 1;

        await nango.trackDeletesStart('Contact');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-all-contacts
            endpoint: '/v1/contacts',
            params: {
                per_page: 50
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: currentPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 50,
                response_path: 'contacts',
                on_page: async () => {
                    currentPage += 1;
                }
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

            await nango.saveCheckpoint({ page: currentPage });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
