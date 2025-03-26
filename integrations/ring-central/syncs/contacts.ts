import type { NangoSync, ProxyConfiguration, Contact } from '../../models';
import type { RingCentralContactRecord } from '../types';

export default async function runSync(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://developers.ringcentral.com/api-reference/External-Contacts/listContacts
        endpoint: '/restapi/v1.0/account/~/extension/~/address-book/contact',
        retries: 10,
        paginate: {
            type: 'offset',
            response_path: 'records',
            offset_name_in_request: 'page',
            offset_calculation_method: 'per-page',
            offset_start_value: 1,
            limit_name_in_request: 'perPage',
            limit: 100
        }
    };

    for await (const records of nango.paginate<RingCentralContactRecord>(config)) {
        const contacts = records.map(
            (record): Contact => ({
                id: record.id.toString(),
                firstName: record.firstName,
                lastName: record.lastName,
                email: record.email,
                phoneNumbers: record.phoneNumbers,
                company: record.company,
                jobTitle: record.jobTitle,
                notes: record.notes
            })
        );

        await nango.batchSave(contacts, 'Contact');
    }
}
