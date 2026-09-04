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

// Checkpoint stores the next page URL path for resuming a full refresh
const CheckpointSchema = z.object({
    nextEndpoint: z.string()
});

function normalizeGraphEndpoint(link: string | undefined): string {
    if (!link) {
        return '';
    }

    try {
        const url = new URL(link, 'https://graph.microsoft.com');
        return `${url.pathname}${url.search}`;
    } catch {
        return link;
    }
}

const sync = createSync({
    description: 'Sync recently used drive items from OneDrive',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    endpoints: [{ method: 'GET', path: '/syncs/recent-items' }],
    metadata: z.void(),
    checkpoint: CheckpointSchema,
    models: {
        RecentItem: RecentItemSchema
    },
    scopes: ['Files.Read', 'offline_access'],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        let nextEndpoint = parsedCheckpoint.success ? parsedCheckpoint.data.nextEndpoint : '';

        // Full refresh: start tracking deletes on every execution, including resumed runs
        await nango.trackDeletesStart('RecentItem');

        const baseEndpoint = '/v1.0/me/drive/recent';
        const initialEndpoint = nextEndpoint || baseEndpoint;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/drive-recent
            endpoint: initialEndpoint,
            ...(initialEndpoint === baseEndpoint ? { params: { $top: 100 } } : {}),
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink',
                response_path: 'value',
                limit: 100,
                limit_name_in_request: '$top',
                on_page: async ({ response }) => {
                    const rawNextLink = response.data?.['@odata.nextLink'];
                    nextEndpoint = normalizeGraphEndpoint(typeof rawNextLink === 'string' ? rawNextLink : undefined);
                }
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

            if (nextEndpoint) {
                await nango.saveCheckpoint({ nextEndpoint });
            }
        }

        // Full refresh: clear checkpoint before ending delete tracking on the success path
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('RecentItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
