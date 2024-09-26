import type { NangoSync, SalesforceAccount, ProxyConfiguration } from '../../models';

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
    const endpoint = '/services/data/v53.0/query';

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

        await nango.batchSave(mappedRecords, 'SalesforceAccount');
    }
}

function mapAccounts(records: any[]): SalesforceAccount[] {
    return records.map((record: any) => {
        return {
            id: record.Id as string,
            name: record.Name,
            website: record.Website,
            description: record.Description,
            no_employees: record.NumberOfEmployees,
            last_modified_date: record.LastModifiedDate
        };
    });
}
