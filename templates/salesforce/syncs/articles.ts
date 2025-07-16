import { createSync } from "nango";
import type { SalesforceArticle } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { Article, SalesforceMetadata } from "../models.js";

const sync = createSync({
    description: "Fetches a list of articles from salesforce",
    version: "1.0.2",
    frequency: "every day",
    autoStart: false,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/articles"
    }],

    models: {
        Article: Article
    },

    metadata: SalesforceMetadata,

    exec: async nango => {
        const metadata = await nango.getMetadata();

        if (!metadata.customFields) {
            throw new Error('An array of custom fields are required');
        }

        const { customFields } = metadata;

        const query = buildQuery(customFields, nango.lastSyncDate);

        await fetchAndSaveRecords(nango, query, customFields);
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

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

async function fetchAndSaveRecords(nango: NangoSyncLocal, query: string, customFields: string[]) {
    const endpoint = '/services/data/v60.0/query';

    const proxyConfig: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_query.htm
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
