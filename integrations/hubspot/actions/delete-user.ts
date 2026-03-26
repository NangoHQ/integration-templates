import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('HubSpot user ID. Example: "12345678". Can also be an email address if using the optional idProperty query parameter.'),
    idProperty: z
        .enum(['USER_ID', 'EMAIL'])
        .optional()
        .describe('Property to use for identifying the user. Defaults to USER_ID. Use EMAIL if passing an email address as user_id.')
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a HubSpot provisioned user by ID',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-user',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings.users.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/settings/users
        const params: Record<string, string> = {};
        if (input.idProperty) {
            params['idProperty'] = input.idProperty;
        }

        await nango.delete({
            endpoint: `/settings/v3/users/${encodeURIComponent(input.userId)}`,
            params,
            retries: 3
        });

        return {
            id: input.userId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
