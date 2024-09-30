import type { NangoSync, Account, ProxyConfiguration } from '../../models';
import type { SalesforceAccount } from '../types';

export default async function fetchData(nango: NangoSync) {
    const query = buildQuery(nango.lastSyncDate);

    await fetchAndSaveRecords(nango, query);
}

function buildQuery(lastSyncDate?: Date): string {
    let baseQuery = `
    SELECT
        Id,
        Name,
        Website,
        Description,
        NumberOfEmployees,
        LastModifiedDate
        FROM Account
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
        const mappedRecords = mapAccounts(records);

        await nango.batchSave(mappedRecords, 'Account');
    }
}

function mapAccounts(records: SalesforceAccount[]): Account[] {
    return records.map(({ Id, Name, Website, Description, NumberOfEmployees, LastModifiedDate }: SalesforceAccount) => ({
        id: Id,
        name: Name,
        website: Website,
        description: Description,
        no_employees: NumberOfEmployees,
        last_modified_date: new Date(LastModifiedDate).toISOString()
    }));
}
