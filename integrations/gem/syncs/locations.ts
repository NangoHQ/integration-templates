import { createSync } from 'nango';
import type { GemLocation } from '../types.js';
import { toLocation } from '../mappers/to-location.js';

import type { ProxyConfiguration } from 'nango';
import { Location } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Get a list of all locations from Gem ATS',
    version: '1.0.0',
    frequency: 'every 1h',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/locations',
            group: 'Locations'
        }
    ],

    models: {
        Location: Location
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://api.gem.com/ats/v0/reference#tag/Location/paths/~1ats~1v0~1offices~1/get
            endpoint: '/ats/v0/offices',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                limit_name_in_request: 'per_page',
                limit: 100
            },
            params: {
                include_deleted: 'true'
            },
            retries: 10
        };

        for await (const locations of nango.paginate<GemLocation>(proxyConfig)) {
            const mappedLocations = locations.map(toLocation);
            const deletedLocations = mappedLocations.filter((l) => l.deleted_at);
            const activeLocations = mappedLocations.filter((l) => !l.deleted_at);
            if (deletedLocations.length > 0) {
                await nango.batchDelete(deletedLocations, 'Location');
            }
            if (activeLocations.length > 0) {
                await nango.batchSave(activeLocations, 'Location');
            }
        }
    await nango.deleteRecordsFromPreviousExecutions("Location");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
