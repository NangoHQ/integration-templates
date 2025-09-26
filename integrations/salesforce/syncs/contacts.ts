import { createSync } from 'nango';
import { buildQuery } from '../utils.js';
import type { SalesforceContact } from '../types.js';
import { toContact } from '../mappers/toContact.js';

import type { ProxyConfiguration } from 'nango';
import { Contact } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of contacts from salesforce',
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

    scopes: ['offline_access', 'api'],

    models: {
        Contact: Contact
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const fields = [
            'Id',
            'FirstName',
            'LastName',
            'Account.Name',
            'Email',
            'AccountId',
            'OwnerId',
            'Owner.Name',
            'MobilePhone',
            'Phone',
            'Title',
            'Salutation',
            'LastModifiedDate'
        ];
        const query = buildQuery('Contact', fields, nango.lastSyncDate);

        await fetchAndSaveRecords(nango, query);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchAndSaveRecords(nango: NangoSyncLocal, query: string) {
    const endpoint = '/services/data/v60.0/query';

    const proxyConfig: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_query.htm
        endpoint,
        retries: 10,
        params: { q: query },
        paginate: {
            type: 'link',
            response_path: 'records',
            link_path_in_response_body: 'nextRecordsUrl'
        }
    };

    // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contact.htm
    for await (const contacts of nango.paginate<SalesforceContact>(proxyConfig)) {
        const mappedContacts = contacts.map((contact: SalesforceContact) => toContact(contact));
        await nango.batchSave(mappedContacts, 'Contact');
    }
}
