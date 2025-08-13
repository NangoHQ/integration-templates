import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, IdEntity } from '../models.js';

const action = createAction({
    description: 'Enables a disabled user.',
    version: '1.0.0',

    endpoint: {
        method: 'PUT',
        path: '/users/enable',
        group: 'Users'
    },

    input: IdEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        const fetchConfig: ProxyConfiguration = {
            // https://www.metabase.com/docs/latest/api/user
            endpoint: `/api/user/${input.id}`,
            retries: 3
        };

        const userResponse = await nango.get(fetchConfig);

        if (!userResponse || !userResponse.data) {
            throw new nango.ActionError({
                message: `User with ID ${input.id} not found.`,
                statusCode: 404
            });
        }

        const user = userResponse.data;

        if (user.is_active) {
            await nango.log(`User with ID ${input.id} is already active.`);
            return {
                success: true
            };
        }

        const reactivateConfig: ProxyConfiguration = {
            // https://www.metabase.com/docs/latest/api/user
            endpoint: `/api/user/${input.id}/reactivate`,
            retries: 3
        };

        await nango.put<SuccessResponse>(reactivateConfig);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
