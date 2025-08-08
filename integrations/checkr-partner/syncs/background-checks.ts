import { createSync } from 'nango';
import { constructRequest } from '../helpers/construct-request.js';
import { toBackgroundCheck } from '../mappers/to-background-check.js';

import { BackgroundCheck } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetch all the background checks',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/background-checks'
        }
    ],

    models: {
        BackgroundCheck: BackgroundCheck
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config = await constructRequest(nango, '/v1/invitations');

        for await (const invitations of nango.paginate(config)) {
            const backgroundChecks = invitations.map((invitation) => {
                return toBackgroundCheck(invitation);
            });
            await nango.batchSave(backgroundChecks, 'BackgroundCheck');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
