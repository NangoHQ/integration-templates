import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z.unknown()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Images records.',
    version: '1.0.0',
    endpoints: [{
        method: 'GET',
        path: '/omnisend/sync/image',
        group: 'Images'
    }],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendImage: record },
    exec: async (nango) => runCollectionSync(nango, {
        method: 'GET',
        path: '/images',
        model: 'OmnisendImage',
        collectionKey: 'images',
        idField: 'id'
    })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
