import { createAction } from 'nango';
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, IdEntity } from '../models.js';

/**
 * Executes the delete user action by validating input, constructing the endpoint,
 * and making the API call to Calendly to delete the user from an organization.
 */
const action = createAction({
    description: 'Deletes a user in Calendly',
    version: '2.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ['admin'],

    exec: async (nango, input): Promise<SuccessResponse> => {
        await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://developer.calendly.com/api-docs/269e89d9f559f-remove-user-from-organization
            endpoint: `/organization_memberships/${input.id}`,
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
