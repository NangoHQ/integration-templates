import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { ConfluenceSpace } from '../models.js';
import { z } from 'zod';

async function getCloudId(nango: NangoSyncLocal): Promise<string> {
    const response = await nango.get({
        baseUrlOverride: 'https://api.atlassian.com',
        endpoint: `oauth/token/accessible-resources`,
        retries: 10 // Exponential backoff + long-running job = handles rate limits well.
    });
    return response.data[0].id;
}

const sync = createSync({
    description: 'Fetches a list of spaces from confluence',
    version: '2.0.0',
    frequency: 'every 4 hours',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/spaces'
        }
    ],

    scopes: ['read:space:confluence'],

    models: {
        ConfluenceSpace: ConfluenceSpace
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const cloudId = await getCloudId(nango);
        let totalRecords = 0;

        const proxyConfig: ProxyConfiguration = {
            baseUrlOverride: `https://api.atlassian.com/ex/confluence/${cloudId}`, // The base URL is specific for user because of the cloud ID path param
            // https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/#api-spaces-get
            endpoint: `/wiki/api/v2/spaces`,
            retries: 10,
            paginate: {
                limit: 100
            }
        };
        for await (const spaceBatch of nango.paginate(proxyConfig)) {
            const confluenceSpaces = mapConfluenceSpaces(spaceBatch);
            const batchSize: number = confluenceSpaces.length;
            totalRecords += batchSize;

            await nango.log(`Saving batch of ${batchSize} spaces (total records: ${totalRecords})`);
            await nango.batchSave(confluenceSpaces, 'ConfluenceSpace');
        }

        await nango.deleteRecordsFromPreviousExecutions('ConfluenceSpace');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapConfluenceSpaces(spaces: any[]): ConfluenceSpace[] {
    return spaces.map((space: any) => {
        return {
            id: space.id,
            key: space.key,
            name: space.name,
            type: space.type,
            status: space.status,
            authorId: space.authorId,
            createdAt: space.createdAt,
            homepageId: space.homepageId,
            description: space.description || ''
        };
    });
}
