import { createSync } from 'nango';
import { z } from 'zod';

// https://developers.google.com/workspace/calendar/api/v3/reference/settings

const SettingSchema = z.object({
    id: z.string(),
    value: z.string(),
    etag: z.union([z.string(), z.null()]).optional()
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const sync = createSync({
    description: 'Sync calendar settings',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/settings', group: 'Settings' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Setting: SettingSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const pageToken = checkpoint?.page_token as string | undefined;

        // https://developers.google.com/workspace/calendar/api/v3/reference/settings/list
        const proxyConfig = {
            endpoint: '/calendar/v3/users/me/settings',
            params: {
                ...(pageToken && { pageToken })
            },
            paginate: {
                type: 'cursor' as const,
                cursor_path_in_response: 'nextPageToken',
                cursor_name_in_request: 'pageToken',
                response_path: 'items',
                limit: 100
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const settings = batch.map((item: { id: string; value: string; etag?: string }) => ({
                id: item.id,
                value: item.value,
                etag: item.etag ?? null
            }));

            if (settings.length > 0) {
                await nango.batchSave(settings, 'Setting');
            }

            // Save checkpoint with next page token
            const lastPage = batch as unknown as { nextPageToken?: string };
            if (lastPage?.nextPageToken) {
                await nango.saveCheckpoint({
                    page_token: lastPage.nextPageToken
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
