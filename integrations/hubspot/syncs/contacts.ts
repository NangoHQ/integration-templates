import { createSync } from 'nango';
import { toContact } from '../mappers/toContact.js';
import type { HubSpotContactNonUndefined } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Contact } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of contacts from Hubspot',
    version: '3.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/contacts',
            group: 'Contacts'
        }
    ],

    scopes: ['crm.objects.contacts.read', 'oauth'],

    models: {
        Contact: Contact
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const properties = [
            'firstname',
            'lastname',
            'email',
            'jobtitle',
            'notes_last_contacted',
            'notes_last_updated',
            'hs_lead_status',
            'lifecyclestage',
            'salutation',
            'mobilephone',
            'website',
            'createdate',
            'hubspot_owner_id'
        ];
        const config: ProxyConfiguration = {
            //https://developers.hubspot.com/docs/api/crm/contacts#retrieve-contacts-by-record-id-email-or-custom-unique-value-property
            endpoint: '/crm/v3/objects/contacts',
            params: {
                properties: properties.join(',')
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.next.after',
                limit_name_in_request: 'limit',
                cursor_name_in_request: 'after',
                response_path: 'results',
                limit: 100
            },
            retries: 10
        };
        for await (const contacts of nango.paginate<HubSpotContactNonUndefined>(config)) {
            const mappedContacts = contacts.map((contact: HubSpotContactNonUndefined) => toContact(contact));
            await nango.batchSave(mappedContacts, 'Contact');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
