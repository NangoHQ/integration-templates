import { createSync } from 'nango';
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toItem } from '../mappers/to-item.js';

import type { ProxyConfiguration } from 'nango';
import { Item } from '../models.js';
import { z } from 'zod';

type Checkpoint = {
    ifModifiedSince: string;
}

const sync = createSync({
    description: 'Fetches all items in Xero. Incremental sync, does not detect deletes, metadata is not\nrequired.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

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

        const checkpoint = await nango.getCheckpoint<Checkpoint>();

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/items/#get-items
            endpoint: 'api.xro/2.0/Items',
            headers: {
                'xero-tenant-id': tenant_id,
                'If-Modified-Since': checkpoint.ifModifiedSince ?? ''
            },
            retries: 10
        };

        const startedAt = new Date();
        // This endpoint does not support pagination.
        const res = await nango.get(config);
        const items = res.data.Items;

        const mappedItems = items.map(toItem);
        await nango.batchSave(mappedItems, 'Item');
        await nango.setCheckpoint<Checkpoint>({
            ifModifiedSince: startedAt.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
