import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// DriveItem model for recent items from Microsoft Graph API
const RecentItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional()
});

// Raw provider schema matching Microsoft Graph API response
const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional()
});

const sync = createSync({
    description: 'Sync recently used drive items from OneDrive',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    endpoints: [{ method: 'GET', path: '/syncs/recent-items' }],
    metadata: z.void(),
    models: {
        RecentItem: RecentItemSchema
    },

    exec: async (nango) => {
        // Full refresh: start tracking deletes before fetching data
        await nango.trackDeletesStart('RecentItem');

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/drive-recent
            endpoint: '/v1.0/me/drive/recent',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: '@odata.nextLink',
                cursor_name_in_request: '$skiptoken',
                response_path: 'value',
                limit: 100,
                limit_name_in_request: '$top'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const providerItems = z.array(ProviderDriveItemSchema).safeParse(page);

            if (!providerItems.success) {
                throw new Error(`Failed to parse recent items: ${providerItems.error.message}`);
            }

            const items = providerItems.data.map((item) => ({
                id: item.id,
                name: item.name,
                ...(item.createdDateTime && { createdDateTime: item.createdDateTime }),
                ...(item.lastModifiedDateTime && { lastModifiedDateTime: item.lastModifiedDateTime }),
                ...(item.size !== undefined && { size: item.size }),
                ...(item.webUrl && { webUrl: item.webUrl })
            }));

            if (items.length > 0) {
                await nango.batchSave(items, 'RecentItem');
            }
        }

        // Full refresh: end tracking deletes after successful fetch and save
        await nango.trackDeletesEnd('RecentItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
