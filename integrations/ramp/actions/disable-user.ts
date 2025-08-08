import { createAction } from 'nango';
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, IdEntity } from '../models.js';

const action = createAction({
    description: 'Deletes a user in Ramp by id',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ['users:write'],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/users#patch-developer-v1-users-user-id-deactivate
            endpoint: `/developer/v1/users/${encodeURIComponent(parsedInput.data.id)}/deactivate`,
            retries: 3
        };

        await nango.patch(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
