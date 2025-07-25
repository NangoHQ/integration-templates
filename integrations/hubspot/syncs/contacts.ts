import type { NangoSync, Contact, ProxyConfiguration } from '../../models.js';
import { toContact } from '../mappers/toContact.js';
import type { HubSpotContactNonUndefined } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
        await nango.batchSave<Contact>(mappedContacts, 'Contact');
    }
}
