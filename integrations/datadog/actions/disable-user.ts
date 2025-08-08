import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, IdEntity } from '../models.js';

const action = createAction({
    description: 'Disables a user in Datadog',
    version: '2.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ['user_access_manage'],

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input || !input.id) {
            throw new nango.ActionError({
                message: 'Id is required'
            });
        }

        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/users/?code-lang=typescript#disable-a-user
            endpoint: `/v2/users/${input.id}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
