import { createSync } from "nango";
import { toContact } from '../mappers/to-contact.js';
import type { IntercomContact } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { Contact } from "../models.js";
import { z } from "zod";

/**
 * Fetches Intercom contacts, maps them to IntercomContact objects,
 * and saves the processed contacts using NangoSync.
 *
 * This function handles pagination and ensures that all contacts are fetched,
 * transformed, and stored.
 *
 * For endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/listcontacts
 *
 * @param nango An instance of NangoSync for synchronization tasks.
 * @returns Promise that resolves when all contacts are fetched and saved.
 */
const sync = createSync({
    description: "Fetches a list of contacts from Intercom",
    version: "1.0.1",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/contacts"
    }],

    models: {
        Contact: Contact
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/listcontacts
            endpoint: '/contacts',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'pages.next.starting_after',
                limit_name_in_request: 'per_page',
                cursor_name_in_request: 'starting_after',
                response_path: 'data',
                limit: 100
            },
            headers: {
                'Intercom-Version': '2.9'
            },
            retries: 10
        };

        if (nango.lastSyncDate) {
            config.data = {
                query: {
                    operator: 'AND',
                    value: [
                        {
                            field: 'updated_at',
                            operator: '>',
                            value: Math.floor(nango.lastSyncDate.getTime() / 1000)
                        }
                    ]
                }
            };
        }

        for await (const contacts of nango.paginate<IntercomContact>(config)) {
            const mappedContacts = contacts.map((contact: IntercomContact) => toContact(contact));
            await nango.batchSave(mappedContacts, 'Contact');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
