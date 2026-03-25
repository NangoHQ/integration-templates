import { createSync } from 'nango';
import { z } from 'zod';

const SettingSchema = z.object({
    id: z.string(),
    value: z.string(),
    kind: z.string(),
    etag: z.string()
});

const sync = createSync({
    description: 'Sync calendar settings',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Setting: SettingSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/settings'
        }
    ],

    exec: async (nango) => {
        await nango.trackDeletesStart('Setting');

        // https://developers.google.com/workspace/calendar/api/v3/reference/settings/list
        const response = await nango.get({
            endpoint: '/calendar/v3/users/me/settings',
            retries: 3
        });

        const rawItems = response.data.items;
        if (Array.isArray(rawItems)) {
            const settings = rawItems
                .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
                .map((item) => ({
                    id: typeof item['id'] === 'string' ? item['id'] : '',
                    value: typeof item['value'] === 'string' ? item['value'] : '',
                    kind: typeof item['kind'] === 'string' ? item['kind'] : '',
                    etag: typeof item['etag'] === 'string' ? item['etag'] : ''
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
