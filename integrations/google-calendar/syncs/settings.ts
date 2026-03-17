import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developers.google.com/workspace/calendar/api/v3/reference/settings

const SettingSchema = z.object({
    id: z.string(),
    value: z.string(),
    etag: z.string().optional()
});

const CheckpointSchema = z.object({
    pageToken: z.string()
});

const SettingsItemSchema = z.object({
    id: z.string(),
    value: z.string(),
    etag: z.string().optional()
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
        const checkpointResult = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const pageToken = checkpointResult.success ? checkpointResult.data.pageToken : undefined;

        // https://developers.google.com/workspace/calendar/api/v3/reference/settings/list
        const proxyConfig = {
            endpoint: '/calendar/v3/users/me/settings',
            params: {
                ...(pageToken ? { pageToken } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'nextPageToken',
                cursor_name_in_request: 'pageToken',
                response_path: 'items',
                limit_name_in_request: 'maxSize',
                limit: 100
            },
            retries: 3
        } satisfies ProxyConfiguration;

        for await (const batch of nango.paginate(proxyConfig)) {
            const items = z.array(SettingsItemSchema).parse(batch);
            const settings = items.map((item) => ({
                id: item.id,
                value: item.value,
                etag: item.etag ?? undefined
            }));

            if (settings.length > 0) {
                await nango.batchSave(settings, 'Setting');
            }
        }

        await nango.saveCheckpoint({
            pageToken: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
