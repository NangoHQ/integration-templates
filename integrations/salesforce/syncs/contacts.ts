import type { NangoSync, Contact, ProxyConfiguration } from '../../models';
import type { SalesforceContact } from '../types';

export default async function fetchData(nango: NangoSync) {
    const query = buildQuery(nango.lastSyncDate);

    await fetchAndSaveRecords(nango, query);
}

function buildQuery(lastSyncDate?: Date): string {
    let baseQuery = `
    SELECT
    Id,
    FirstName,
    LastName,
    Email,
    AccountId,
    LastModifiedDate
    FROM Contact
    `;

    if (lastSyncDate) {
        baseQuery += ` WHERE LastModifiedDate > ${lastSyncDate.toISOString()}`;
    }

    return baseQuery;
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

    for await (const records of nango.paginate(proxyConfig)) {
        const mappedRecords = mapContacts(records);

        await nango.batchSave(mappedRecords, 'Contact');
    }
}

function mapContacts(records: SalesforceContact[]): Contact[] {
    return records.map(({ Id, FirstName, LastName, Email, AccountId, LastModifiedDate }: SalesforceContact) => ({
        id: Id,
        first_name: FirstName,
        last_name: LastName,
        email: Email,
        account_id: AccountId,
        last_modified_date: new Date(LastModifiedDate).toISOString()
    }));
}
