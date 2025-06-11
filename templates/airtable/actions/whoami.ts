import { createAction } from 'nango';
import type { AirtableWhoAmIResponse } from '../types';

import type { ProxyConfiguration } from 'nango';
import { UserInformation } from '../../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Fetch current user information',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/whoami',
        group: 'Users'
    },

    input: z.void(),
    output: UserInformation,
    scopes: ['user.email:read'],

    exec: async (nango): Promise<UserInformation> => {
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/get-user-id-scopes
            endpoint: '/v0/meta/whoami',
            retries: 3
        };

        const { data } = await nango.get<AirtableWhoAmIResponse>(config);

        const user: UserInformation = {
            id: data.id,
            email: data?.email || null
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
