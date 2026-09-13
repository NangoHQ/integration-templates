import { createSync } from 'nango';
import * as z from 'zod';
import { emailUniversalLayoutSchema } from '../schemas/email-universal-layout.js';
import { runCollectionSync } from '../shared.js';

const record = z.object({ id: z.string(), data: emailUniversalLayoutSchema });

const sync = createSync({
    description: 'Synchronizes Omnisend Email Universal Layouts records.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/omnisend/sync/emailuniversallayout', group: 'Email Universal Layouts' }],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: z.void(),
    models: { OmnisendEmailUniversalLayout: record },
    exec: async (nango) => runCollectionSync(nango, {
        method: 'GET', path: '/email-universal-layouts', model: 'OmnisendEmailUniversalLayout', collectionKey: 'universalLayouts', idField: 'id', itemSchema: record.shape.data
    })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;