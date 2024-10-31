import type { NangoSync, Article, ProxyConfiguration, SalesforceMetadata } from '../../models';
import type { SalesforceArticle } from '../types';

export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<SalesforceMetadata>();

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
        const mappedRecords = mapRecords(records, customFields);

        await nango.batchSave(mappedRecords, 'Article');
    }
}

function mapRecords(records: SalesforceArticle[], customFields: string[]): Article[] {
    return records.map(({ Id, Title, LastModifiedDate, ...rest }: Record<string, any>) => {
        const content = customFields.map((field) => `Field: ${field}\n${rest[field] ?? 'N/A'}`).join('\n');

        return {
            id: Id,
            title: Title,
            content,
            last_modified_date: new Date(LastModifiedDate).toISOString()
        };
    });
}
