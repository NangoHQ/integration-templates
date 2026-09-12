import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z
        .object({
            categoryIDs: z.array(z.string()).optional(),
            createdAt: z.string().optional(),
            currency: z.string(),
            defaultImageUrl: z.string().max(1000).optional(),
            description: z.string().max(1000).optional(),
            id: z.string().max(100),
            images: z.array(z.string()).optional(),
            status: z.enum(['inStock', 'outOfStock', 'notAvailable']),
            tags: z.array(z.string()).optional(),
            title: z.string().max(255),
            type: z.string().max(100).optional(),
            updatedAt: z.string().optional(),
            url: z.string().max(1000),
            variants: z
                .array(
                    z
                        .object({
                            defaultImageUrl: z.string().max(1000).optional(),
                            description: z.string().max(1000).optional(),
                            id: z.string().max(100),
                            images: z.array(z.string()).optional(),
                            price: z.number(),
                            sku: z.string().max(255).optional(),
                            status: z.enum(['inStock', 'outOfStock', 'notAvailable']).optional(),
                            strikeThroughPrice: z.number().optional(),
                            title: z.string().max(255),
                            url: z.string().max(1000)
                        })
                        .passthrough()
                )
                .optional(),
            vendor: z.string().max(100).optional()
        })
        .passthrough()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Products records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/product',
            group: 'Products'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendProduct: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/products',
            model: 'OmnisendProduct',
            collectionKey: 'products',
            idField: 'id',
            pagination: 'offset'
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
