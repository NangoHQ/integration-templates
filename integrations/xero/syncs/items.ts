import { createSync } from 'nango';
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toItem } from '../mappers/to-item.js';

import type { ProxyConfiguration } from 'nango';
import { Item } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches all items in Xero. Incremental sync, does not detect deletes, metadata is not\nrequired.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/items',
            group: 'Items'
        }
    ],

    scopes: ['accounting.settings'],

    models: {
        Item: Item
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const tenant_id = await getTenantId(nango);

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/items/#get-items
            endpoint: 'api.xro/2.0/Items',
            headers: {
                'xero-tenant-id': tenant_id,
                'If-Modified-Since': ''
            },
            retries: 10
        };

        // If it is an incremental sync, only fetch the changed payments
        if (nango.lastSyncDate && config.headers) {
            config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
        }

        // This endpoint does not support pagination.
        const res = await nango.get(config);
        const items = res.data.Items;

        const mappedItems = items.map(toItem);
        await nango.batchSave(mappedItems, 'Item');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
