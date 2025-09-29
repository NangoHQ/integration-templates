import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { EvaluAgentUser } from '../models.js';
import { z } from 'zod';

interface EvaluAgentUserResponseCustom {
    third_party_id: string;
    start_date: string;
}
interface EvaluAgentUserResponse {
    id: string;
    attributes: EvaluAgentUser & EvaluAgentUserResponseCustom;
}

const sync = createSync({
    description: 'Fetches a list of users from evaluagent',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/users'
        }
    ],

    models: {
        EvaluAgentUser: EvaluAgentUser
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const payload: ProxyConfiguration = {
            // https://docs.evaluagent.com/#operation/fetchUsers
            endpoint: '/v1/org/users',
            retries: 10
        };

        const response = await nango.get(payload);

        const returnedData = response.data.data;

        const mappedUsers: EvaluAgentUser[] = returnedData.map((user: EvaluAgentUserResponse) => ({
            id: user.id,
            forename: user.attributes.forename,
            surname: user.attributes.surname,
            email: user.attributes.email,
            username: user.attributes.username,
            startDate: user.attributes.start_date,
            active: user.attributes.active,
            thirdPartyId: user.attributes.third_party_id
        }));

        if (mappedUsers.length > 0) {
            await nango.batchSave(mappedUsers, 'EvaluAgentUser');
            await nango.log(`Sent ${mappedUsers.length} users`);
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
