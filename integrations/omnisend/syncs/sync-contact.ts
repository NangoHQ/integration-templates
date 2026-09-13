import { createSync } from 'nango';
import * as z from 'zod';
import { contactSchema, runCollectionSync } from '../shared.js';

const record = z.object({
    id: z.string(),
    data: contactSchema
});

const sync = createSync({
    description: 'Synchronizes Omnisend Contacts records.',
    version: '1.0.0',
    endpoints: [
        {
            method: 'GET',
            path: '/omnisend/sync/contact',
            group: 'Contacts'
        }
    ],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendContact: record },
    exec: async (nango) =>
        runCollectionSync(nango, {
            method: 'GET',
            path: '/contacts',
            model: 'OmnisendContact',
            collectionKey: 'contacts',
            idField: 'id',
            pagination: 'cursor'
        })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
