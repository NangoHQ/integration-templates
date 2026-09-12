import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z
        .object({
            createdAt: z.string().optional(),
            height: z.number().int().optional(),
            id: z.string().optional(),
            name: z.string().optional(),
            size: z.number().int().optional(),
            type: z.string().optional(),
            url: z.string().optional(),
            width: z.number().int().optional()
        })
        .passthrough()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Images records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/image',
            group: 'Images'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendImage: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/images',
            model: 'OmnisendImage',
            collectionKey: 'images',
            idField: 'id',
            pagination: 'cursor'
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
