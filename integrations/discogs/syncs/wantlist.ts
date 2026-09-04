import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { getDiscogsUsername } from '../helpers/get-discogs-username.js';

const WantlistItemSchema = z.object({
    id: z.string(),
    release_id: z.number(),
    rating: z.number().optional(),
    date_added: z.string().optional(),
    notes: z.string().optional(),
    basic_information: z.record(z.string(), z.unknown()).optional()
});

const ProviderWantSchema = z
    .object({
        id: z.number(),
        rating: z.number().nullish(),
        date_added: z.string().nullish(),
        notes: z.string().nullish(),
        basic_information: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync the authenticated user wantlist.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    endpoints: [{ method: 'GET', path: '/wantlist', group: 'Wantlist' }],
    models: { WantlistItem: WantlistItemSchema },

    exec: async (nango) => {
        const username = await getDiscogsUsername(nango);

        await nango.trackDeletesStart('WantlistItem');

        const proxyConfig: ProxyConfiguration = {
            // https://www.discogs.com/developers#page:user-wantlist,header-user-wantlist-wantlist
            endpoint: `/users/${encodeURIComponent(username)}/wants`,
            retries: 3,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'wants',
                limit_name_in_request: 'per_page',
                limit: 100
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const wants = z.array(ProviderWantSchema).parse(page);
            const items = wants.map((want) => ({
                id: String(want.id),
                release_id: want.id,
                ...(want.rating != null && { rating: want.rating }),
                ...(want.date_added != null && { date_added: want.date_added }),
                ...(want.notes != null && { notes: want.notes }),
                ...(want.basic_information !== undefined && { basic_information: want.basic_information })
            }));

            if (items.length > 0) {
                await nango.batchSave(items, 'WantlistItem');
            }
        }
        await nango.trackDeletesEnd('WantlistItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
