import { createSync } from 'nango';
import { paginate } from '../helpers/paginate.js';
import { getCredentials } from '../helpers/get-credentials.js';
import type { ReturnedUser } from '../types.js';
import { toUser } from '../mappers/to-user.js';

import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Lastpass.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/users',
            group: 'Users'
        }
    ],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const credentials = await getCredentials(nango);
        const paginationParams = {
            // https://support.lastpass.com/s/document-item?language=en_US&bundleId=lastpass&topicId=LastPass%2Fapi_get_user_data.html&_LANG=enus
            endpoint: '/enterpriseapi.php',
            cid: credentials.cid,
            provhash: credentials.provhash,
            cmd: 'getuserdata',
            pageSize: 100
        };

        const generator = paginate<ReturnedUser>(nango, paginationParams);
        for await (const { results } of generator) {
            const users: User[] = toUser(results);
            await nango.batchSave(users, 'User');
        }
    await nango.deleteRecordsFromPreviousExecutions("User");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
