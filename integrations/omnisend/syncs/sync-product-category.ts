import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z
        .object({ categoryID: z.string().optional(), createdAt: z.string().optional(), title: z.string().optional(), updatedAt: z.string().optional() })
        .passthrough()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Product Categories records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/productcategory',
            group: 'Product Categories'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendProductCategory: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/product-categories',
            model: 'OmnisendProductCategory',
            collectionKey: 'categories',
            idField: 'categoryID',
            itemSchema: record.shape.data,
            pagination: 'offset'
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
