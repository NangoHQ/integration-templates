import { createSync } from 'nango';
import { z } from 'zod';

const ContactSchema = z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    picture: z.string().optional(),
    last_meeting_date: z.string().optional()
});

const sync = createSync({
    description: 'Full-refresh sync of contacts derived from meeting participants.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/contacts' }],
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        // Blocker: provider contacts query has no filter, pagination, or cursor arguments.

        // https://docs.fireflies.ai/graphql-api/query/contacts
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: 'query Contacts { contacts { email name picture last_meeting_date } }'
            },
            retries: 3
        });

        const parsed = z
            .object({
                data: z.object({
                    contacts: z.array(
                        z.object({
                            email: z.string(),
                            name: z.string().nullish(),
                            picture: z.string().nullish(),
                            last_meeting_date: z.string().nullish()
                        })
                    )
                })
            })
            .safeParse(response.data);

        if (!parsed.success) {
            throw new Error('Failed to parse Fireflies contacts response: ' + JSON.stringify(parsed.error.issues));
        }

        const contacts = parsed.data.data.contacts.map((contact) => {
            return {
                id: contact.email,
                email: contact.email,
                ...(contact.name != null && { name: contact.name }),
                ...(contact.picture != null && { picture: contact.picture }),
                ...(contact.last_meeting_date != null && { last_meeting_date: contact.last_meeting_date })
            };
        });

        await nango.trackDeletesStart('Contact');

        if (contacts.length > 0) {
            await nango.batchSave(contacts, 'Contact');
        }

        await nango.trackDeletesEnd('Contact');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
