import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z.unknown()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Products records.',
    version: '1.0.0',
    endpoints: [{
        method: 'GET',
        path: '/omnisend/sync/product',
        group: 'Products'
    }],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendProduct: record },
    exec: async (nango) => runCollectionSync(nango, {
        method: 'GET',
        path: '/products',
        model: 'OmnisendProduct',
        collectionKey: 'products',
        idField: 'id'
    })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
