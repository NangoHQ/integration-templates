import type { NangoSync, SalesforceDeal, ProxyConfiguration } from '../../models';

export default async function fetchData(nango: NangoSync) {
    const query = buildQuery(nango.lastSyncDate);

    await fetchAndSaveRecords(nango, query);
}

function buildQuery(lastSyncDate?: Date): string {
    let baseQuery = `
        SELECT
        Id,
        Name,
        Amount,
        StageName,
        AccountId,
        LastModifiedDate
        FROM Opportunity
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
        const mappedRecords = mapDeals(records);

        await nango.batchSave(mappedRecords, 'SalesforceDeal');
    }
}

function mapDeals(records: any[]): SalesforceDeal[] {
    return records.map((record: any) => {
        return {
            id: record.Id as string,
            name: record.Name,
            amount: record.Amount,
            stage: record.StageName,
            account_id: record.AccountId,
            last_modified_date: record.LastModifiedDate
        };
    });
}
