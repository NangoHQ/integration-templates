import { createSync } from "nango";
import type { FreshdeskContact } from '../types.js';
import { toContact } from '../mappers/to-contact.js';

import type { ProxyConfiguration } from "nango";
import { Contact } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches the list of contacts.",
    version: "2.0.0",
    frequency: "every day",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/contacts",
        group: "Contacts"
    }],

    models: {
        Contact: Contact
    },

    metadata: z.object({}),

    exec: async nango => {
        const proxyConfiguration: ProxyConfiguration = {
            // https://developer.freshdesk.com/api/#list_all_contacts
            endpoint: '/api/v2/contacts',
            retries: 10,
            paginate: {
                type: 'link',
                limit_name_in_request: 'per_page',
                link_rel_in_response_header: 'next'
            }
        };

        if (nango.lastSyncDate) {
            proxyConfiguration.params = {
                updated_since: nango.lastSyncDate.toISOString()
            };
        }

        for await (const freshdeskUsers of nango.paginate<FreshdeskContact>(proxyConfiguration)) {
            const contacts: Contact[] = freshdeskUsers.map(toContact) || [];

            await nango.batchSave(contacts, 'Contact');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
