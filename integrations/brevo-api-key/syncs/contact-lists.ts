import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ContactListSchema = z
    .object({
        id: z.string().describe('Unique identifier of the contact list. Brevo list IDs are numeric in the API and are exposed here as strings.'),
        name: z.string().describe('Name of the contact list.'),
        folderId: z.number().describe('ID of the folder that contains this list.'),
        uniqueSubscribers: z.number().describe('Number of unique contacts currently subscribed to the list.'),
        totalSubscribers: z
            .number()
            .optional()
            .describe('Number of contacts in the list. Brevo is deprecating this attribute, so it may be omitted or reported as 0.'),
        totalBlacklisted: z
            .number()
            .optional()
            .describe('Number of blacklisted contacts in the list. Brevo is deprecating this attribute, so it may be omitted or reported as 0.')
    })
    .describe('A Brevo contact list (metadata only, not list membership).');

const BrevoContactListSchema = z.object({
    id: z.number(),
    name: z.string(),
    folderId: z.number(),
    uniqueSubscribers: z.number(),
    totalSubscribers: z.number().optional(),
    totalBlacklisted: z.number().optional()
});

const sync = createSync({
    description: 'Fetches all Brevo contact lists (metadata only, not list membership) via full refresh.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ContactList: ContactListSchema
    },

    exec: async (nango) => {
        // GET /contacts/lists exposes no incremental filter, so this is a full refresh:
        // deletion detection relies on crawling every page between trackDeletesStart and trackDeletesEnd.
        await nango.trackDeletesStart('ContactList');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/getlists-1
            endpoint: '/contacts/lists',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'lists'
            },
            retries: 3
        };

        for await (const batch of nango.paginate<unknown>(proxyConfig)) {
            // Throw on parse failure: skipping a record in a delete-tracked crawl would falsely mark a live list as deleted.
            const lists = z
                .array(BrevoContactListSchema)
                .parse(batch)
                .map((list) => ({
                    id: String(list.id),
                    name: list.name,
                    folderId: list.folderId,
                    uniqueSubscribers: list.uniqueSubscribers,
                    ...(list.totalSubscribers !== undefined && { totalSubscribers: list.totalSubscribers }),
                    ...(list.totalBlacklisted !== undefined && { totalBlacklisted: list.totalBlacklisted })
                }));

            if (lists.length > 0) {
                await nango.batchSave(lists, 'ContactList');
            }
        }

        await nango.trackDeletesEnd('ContactList');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
