import type { NangoSync, Contact, ProxyConfiguration } from '../../models';
import type { HubspotContact } from '../types';

export default async function fetchData(nango: NangoSync) {
    const properties = ['firstname', 'lastname', 'email'];

    let totalRecords = 0;

    const config: ProxyConfiguration = getConfig(properties);

    for await (const contact of nango.paginate(config)) {
        const mappedContact = mapContacts(contact);

        const batchSize: number = mappedContact.length;
        totalRecords += batchSize;
        await nango.log(`Saving batch of ${batchSize} contacts (total contacts: ${totalRecords})`);
        await nango.batchSave(mappedContact, 'Contact');
    }
}

function mapContacts(records: HubspotContact[]): Contact[] {
    return records.map((record: HubspotContact) => {
        return {
            id: String(record.id),
            created_at: record.createdAt,
            updated_at: record.updatedAt,
            first_name: record.properties.firstname,
            last_name: record.properties.lastname,
            email: record.properties.email,
            active: record.archived !== true,
            primaryCompanyId: record?.associations?.companies?.results?.filter((association) => association.type === 'contact_to_company')[0]?.id
        };
    });
}

function getConfig(properties: string[]) {
    const associations = ['company'];

    const config: ProxyConfiguration = {
        endpoint: '/crm/v3/objects/contacts',
        method: 'GET',
        params: {
            properties: properties.join(','),
            associations: associations.join(',')
        },
        retries: 10
    };

    return config;
}
