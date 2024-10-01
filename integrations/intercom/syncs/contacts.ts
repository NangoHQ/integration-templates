import type { NangoSync, ProxyConfiguration, Contact } from '../../models';
import { toContact } from '../mappers/to-contact.js';
import type { IntercomContact } from '../types';

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
export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
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

    for await (const contacts of nango.paginate<IntercomContact>(config)) {
        const mappedContacts = contacts.map((contact: IntercomContact) => toContact(contact));
        await nango.batchSave<Contact>(mappedContacts, 'Contact');
    }
}
