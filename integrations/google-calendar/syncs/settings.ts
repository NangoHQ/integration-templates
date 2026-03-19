import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developers.google.com/workspace/calendar/api/v3/reference/settings

const SettingSchema = z.object({
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

    models: {
        Setting: SettingSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Setting');

        // Full refresh is enough here because the settings collection is tiny
        // (Google caps `maxResults` at 250) and missing settings should be removed.
        // https://developers.google.com/workspace/calendar/api/v3/reference/settings/list
        const proxyConfig = {
            endpoint: '/calendar/v3/users/me/settings',
            params: {
                maxResults: 250
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'nextPageToken',
                cursor_name_in_request: 'pageToken',
                response_path: 'items',
                limit_name_in_request: 'maxResults',
                limit: 250
            },
            retries: 3
        } satisfies ProxyConfiguration;

        for await (const batch of nango.paginate(proxyConfig)) {
            const settings = z
                .array(SettingSchema)
                .parse(batch)
                .map((item) => ({
                    id: item.id,
                    value: item.value,
                    etag: item.etag ?? undefined
                }));

            if (settings.length > 0) {
                await nango.batchSave(settings, 'Setting');
            }
        }

        await nango.trackDeletesEnd('Setting');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
