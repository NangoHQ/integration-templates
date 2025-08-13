import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, IdEntity } from '../models.js';

const action = createAction({
    description: 'Deletes a user in Hubspot',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: IdEntity,
    output: SuccessResponse,

    scopes: ['oauth', 'settings.users.write (standard scope)', 'crm.objects.users.write (granular)'],

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Id is required'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/settings/user-provisioning
            endpoint: `/settings/v3/users/${input.id}`,
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
