import type { NangoSync, Contact, ProxyConfiguration } from '../../models';
import { buildQuery } from '../utils.js';
import type { SalesforceContact } from '../types';
import { toContact } from '../mappers/toContact.js';

export default async function fetchData(nango: NangoSync) {
    const fields = ['Id', 'FirstName', 'MiddleName', 'LastName', 'Account.Name', 'Email', 'AccountId', 'OwnerId', 'Owner.Name', 'MobilePhone', 'Phone', 'Title', 'Salutation', 'LastModifiedDate'];
    const query = buildQuery('Contact', fields, nango.lastSyncDate);

    await fetchAndSaveRecords(nango, query);
}

async function fetchAndSaveRecords(nango: NangoSync, query: string) {
    const endpoint = '/services/data/v60.0/query';

    const proxyConfig: ProxyConfiguration = {
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
        await nango.batchSave<Contact>(mappedContacts, 'Contact');
    }
}
