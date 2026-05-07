import { createSync, ProxyConfiguration } from 'nango';
import * as z from 'zod';

// Provider schema matching Microsoft Graph driveItem from sharedWithMe
// https://learn.microsoft.com/graph/api/resources/driveitem
const RemoteItemSchema = z
    .object({
        id: z.string(),
        driveId: z.string(),
        name: z.string().optional(),
        webUrl: z.string().optional(),
        createdDateTime: z.string().optional(),
        lastModifiedDateTime: z.string().optional(),
        size: z.number().optional(),
        file: z.object({}).passthrough().optional(),
        folder: z.object({}).passthrough().optional(),
        parentReference: z.object({}).passthrough().optional(),
        shared: z.object({}).passthrough().optional()
    })
    .passthrough();

const ProviderDriveItemSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        webUrl: z.string().optional(),
        createdDateTime: z.string().optional(),
        lastModifiedDateTime: z.string().optional(),
        size: z.number().optional(),
        file: z.object({}).passthrough().optional(),
        folder: z.object({}).passthrough().optional(),
        remoteItem: RemoteItemSchema.optional()
    })
    .passthrough();

// Normalized model for shared items
const SharedItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    isFolder: z.boolean().optional(),
    remoteItem: RemoteItemSchema.optional()
});

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
    description: 'Sync items shared with the user',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    endpoints: [{ method: 'POST', path: '/syncs/shared-items' }],
    metadata: z.void(),
    checkpoint: CheckpointSchema,
    models: {
        SharedItem: SharedItemSchema
    },
    scopes: ['Files.Read', 'Files.Read.All', 'offline_access'],

    exec: async (nango) => {
        // /sharedWithMe is a snapshot inventory endpoint with no delta cursor,
        // so we keep full-refresh delete tracking and only checkpoint page links for resumability.
        const checkpoint = await nango.getCheckpoint();
        let nextEndpoint =
            checkpoint && typeof checkpoint === 'object' && 'nextEndpoint' in checkpoint && typeof checkpoint.nextEndpoint === 'string'
                ? checkpoint.nextEndpoint
                : '';

        if (!nextEndpoint) {
            await nango.trackDeletesStart('SharedItem');
        }

        const baseEndpoint = '/v1.0/me/drive/sharedWithMe';
        const initialEndpoint = nextEndpoint || baseEndpoint;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/graph/api/drive-sharedwithme
            endpoint: initialEndpoint,
            ...(initialEndpoint === baseEndpoint ? { params: { $top: 100 } } : {}),
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink',
                response_path: 'value',
                on_page: async ({ response }) => {
                    const rawNextLink = response.data?.['@odata.nextLink'];
                    nextEndpoint = normalizeGraphEndpoint(typeof rawNextLink === 'string' ? rawNextLink : undefined);
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = page.map((rawItem: unknown) => {
                const parseResult = ProviderDriveItemSchema.safeParse(rawItem);
                if (!parseResult.success) {
                    throw new Error(`Failed to parse drive item: ${parseResult.error.message}`);
                }

                const item = parseResult.data;
                return {
                    id: item.id,
                    ...(item.name !== undefined && { name: item.name }),
                    ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
                    ...(item.createdDateTime !== undefined && { createdDateTime: item.createdDateTime }),
                    ...(item.lastModifiedDateTime !== undefined && { lastModifiedDateTime: item.lastModifiedDateTime }),
                    ...(item.size !== undefined && { size: item.size }),
                    ...(item.folder !== undefined && { isFolder: true }),
                    ...(item.remoteItem !== undefined && { remoteItem: item.remoteItem })
                };
            });

            if (items.length > 0) {
                await nango.batchSave(items, 'SharedItem');
            }

            if (nextEndpoint) {
                await nango.saveCheckpoint({ nextEndpoint });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('SharedItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
