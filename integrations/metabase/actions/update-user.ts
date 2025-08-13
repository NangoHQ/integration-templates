import { createAction } from 'nango';
import { updateUserInputSchema } from '../schema.zod.js';
import type { MetabaseUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, UpdateUserInput } from '../models.js';

const action = createAction({
    description: 'Updates an existing, active user in Metabase.',
    version: '1.0.0',

    endpoint: {
        method: 'PUT',
        path: '/users',
        group: 'Users'
    },

    input: UpdateUserInput,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: updateUserInputSchema, input });

        const { id, ...updateData } = parsedInput.data;

        const config: ProxyConfiguration = {
            // https://www.metabase.com/docs/latest/api/user
            endpoint: `/api/user/${id}`,
            retries: 3,
            data: updateData
        };

        await nango.put<MetabaseUser>(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
