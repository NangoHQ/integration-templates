import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { Base } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'List all bases',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/bases'
        }
    ],

    scopes: ['schema.bases:read'],

    models: {
        Base: Base
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/list-bases
            endpoint: '/v0/meta/bases',
            retries: 10,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'offset',
                cursor_name_in_request: 'offset',
                response_path: 'bases'
            }
        };

        for await (const bases of nango.paginate<Base>(config)) {
            await nango.batchSave(bases, 'Base');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
