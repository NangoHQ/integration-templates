import type { NangoSync, ProxyConfiguration, Contact } from '../../models.js';
import type { FreshdeskContact } from '../types.js';
import { toContact } from '../mappers/to-contact.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
