import type { NangoSync, Deal, ProxyConfiguration } from '../../models';
import type { SalesforceDeal } from '../types';

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
        const mappedRecords = mapDeals(records);

        await nango.batchSave(mappedRecords, 'Deal');
    }
}

function mapDeals(records: SalesforceDeal[]): Deal[] {
    return records.map(({ Id, Name, Amount, StageName, AccountId, LastModifiedDate }: SalesforceDeal) => ({
        id: Id,
        name: Name,
        amount: Amount,
        stage: StageName,
        account_id: AccountId,
        last_modified_date: new Date(LastModifiedDate).toISOString()
    }));
}
