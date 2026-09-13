import { createSync } from 'nango';
import * as z from 'zod';
import { runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: z
        .object({ createdAt: z.string().optional(), id: z.string().optional(), name: z.string().max(255).optional(), updatedAt: z.string().optional() })
        .passthrough()
});

const sync = createSync({
    description: 'Synchronizes Omnisend Email Templates records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/emailtemplate',
            group: 'Email Templates'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendEmailTemplate: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/email-templates',
            model: 'OmnisendEmailTemplate',
            collectionKey: 'templates',
            idField: 'id',
            itemSchema: record.shape.data,
            pagination: 'cursor'
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
