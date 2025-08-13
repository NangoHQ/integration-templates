import { createSync } from 'nango';
import type { PageResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { ConfluencePage } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of pages from confluence',
    version: '2.0.0',
    frequency: 'every 4 hours',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/pages'
        }
    ],

    scopes: ['read:page:confluence'],

    models: {
        ConfluencePage: ConfluencePage
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const cloudId: string = await getCloudId(nango);
        const proxyConfig: ProxyConfiguration = {
            // The base URL is specific for user because of the cloud ID path param
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`,
            // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/#api-pages-get
            endpoint: `/wiki/api/v2/pages`,
            params: {
                'body-format': 'storage'
            },
            paginate: {
                limit: 100
            }
        };
        for await (const pageBatch of nango.paginate(proxyConfig)) {
            const confluencePages = mapConfluencePages(pageBatch);
            const batchSize: number = confluencePages.length;
            totalRecords += batchSize;

            await nango.log(`Saving batch of ${batchSize} pages (total records: ${totalRecords})`);
            await nango.batchSave(confluencePages, 'ConfluencePage');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapConfluencePages(results: PageResponse[]): ConfluencePage[] {
    return results.map((page: PageResponse) => {
        return {
            id: page.id,
            title: page.title,
            status: page.status,
            authorId: page.authorId,
            createdAt: page.createdAt,
            spaceId: page.spaceId,
            parentId: page.parentId,
            parentType: page.parentType,
            position: page.position,
            version: {
                createdAt: page.version.createdAt,
                message: page.version.message,
                number: page.version.number,
                minorEdit: page.version.minorEdit,
                authorId: page.version.authorId
            },
            body: {
                storage: page.body.storage
            }
        };
    });
}

async function getCloudId(nango: NangoSyncLocal): Promise<string> {
    const response = await nango.get({
        baseUrlOverride: 'https://api.atlassian.com',
        endpoint: `oauth/token/accessible-resources`,
        retries: 10
    });

    return response.data[0].id;
}
