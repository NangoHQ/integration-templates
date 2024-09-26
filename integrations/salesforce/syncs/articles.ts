import type { NangoSync, SalesforceArticle, ProxyConfiguration } from '../../models';

interface Metadata {
    customFields: string[];
}

export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<Metadata>();

    if (!metadata.customFields) {
        throw new Error('An array of custom fields are required');
    }

    const { customFields } = metadata;

    const query = buildQuery(customFields, nango.lastSyncDate);

    await fetchAndSaveRecords(nango, query, customFields);
}

function buildQuery(customFields: string[], lastSyncDate?: Date): string {
    let baseQuery = `
        SELECT Id, Title, ${customFields.join(' ,')}, LastModifiedDate
        FROM Knowledge__kav
        WHERE IsLatestVersion = true
    `;

    if (lastSyncDate) {
        baseQuery += ` AND LastModifiedDate > ${lastSyncDate.toISOString()}`;
    }

    return baseQuery;
}

async function fetchAndSaveRecords(nango: NangoSync, query: string, customFields: string[]) {
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
        const mappedRecords = mapRecords(records, customFields);

        await nango.batchSave(mappedRecords, 'SalesforceArticle');
    }
}

function mapRecords(records: any[], customFields: string[]): SalesforceArticle[] {
    return records.map((record: any) => {
        return {
            id: record.Id as string,
            title: record.Name,
            content: customFields.map((field: string) => `Field: ${field}\n${record[field]}`).join('\n'),
            last_modified_date: record.LastModifiedDate
        };
    });
}
