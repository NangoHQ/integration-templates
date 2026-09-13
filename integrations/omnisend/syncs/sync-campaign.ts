import { createSync } from 'nango';
import * as z from 'zod';
import { campaignSchema } from '../schemas/campaign.js';
import { runCollectionSync } from '../shared.js';

const record = z.object({ id: z.string(), data: campaignSchema });

const sync = createSync({
    description: 'Synchronizes Omnisend Campaigns records.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/omnisend/sync/campaign', group: 'Campaigns' }],
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    checkpoint: z.object({ after: z.string().min(1) }),
    metadata: z.void(),
    models: { OmnisendCampaign: record },
    exec: async (nango) => runCollectionSync(nango, {
        method: 'GET',
        path: '/campaigns',
        model: 'OmnisendCampaign',
        collectionKey: 'campaigns',
        idField: 'id',
        itemSchema: record.shape.data,
        pagination: 'cursor',
        checkpoint: true
    })
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;