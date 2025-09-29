import { createSync } from 'nango';
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toContact } from '../mappers/to-contact.js';

import type { ProxyConfiguration } from 'nango';
import { Contact } from '../models.js';
import { z } from 'zod';

interface Config extends ProxyConfiguration {
    params: Record<string, string | number>;
}

const sync = createSync({
    description: 'Fetches all Xero contacts.\nDetails: incremental sync, detects deletes, metadata is not required.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/contacts',
            group: 'Contacts'
        }
    ],

    scopes: ['accounting.contacts'],

    models: {
        Contact: Contact
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const tenant_id = await getTenantId(nango);

        const config: Config = {
            endpoint: 'api.xro/2.0/Contacts',
            headers: {
                'xero-tenant-id': tenant_id,
                'If-Modified-Since': ''
            },
            params: {
                page: 1,
                includeArchived: 'false'
            },
            retries: 10
        };

        await nango.log(`Last sync date - type: ${typeof nango.lastSyncDate} JSON value: ${JSON.stringify(nango.lastSyncDate)}`);

        // If it is an incremental sync, only fetch the changed contacts
        if (nango.lastSyncDate && config.params && config.headers) {
            config.params['includeArchived'] = 'true';
            config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
        }

        let page = 1;
        do {
            config.params['page'] = page;
            const res = await nango.get(config);
            const contacts = res.data.Contacts;

            // Save active contacts
            const activeContacts = contacts.filter((x: any) => x.ContactStatus === 'ACTIVE');
            const mappedActiveContacts = activeContacts.map(toContact);
            await nango.batchSave(mappedActiveContacts, 'Contact');

            // If it is an incremental refresh, mark archived contacts as deleted
            if (nango.lastSyncDate) {
                const archivedContacts = contacts.filter((x: any) => x.ContactStatus === 'ARCHIVED');
                const mappedArchivedContacts = archivedContacts.map(toContact);
                await nango.batchDelete(mappedArchivedContacts, 'Contact');
            }

            // Should we still fetch the next page?
            page = contacts.length < 100 ? -1 : page + 1;
        } while (page != -1);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
