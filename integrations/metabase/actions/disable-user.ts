import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, IdEntity } from '../models.js';

const action = createAction({
    description: 'Disables a user in Metabase by id.',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: IdEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        // Validate input (id must be greater than zero)
        if (input.id <= 0) {
            throw new Error('User ID must be an integer greater than zero.');
        }

        const config: ProxyConfiguration = {
            // https://www.metabase.com/docs/latest/api/user
            endpoint: `/api/user/${input.id}`,
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
