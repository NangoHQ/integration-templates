import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    usergroup_id: z.string().describe('The encoded ID of the User Group. Example: "S0604QSJC"')
});

const OutputSchema = z.object({
    users: z.array(z.string()).describe('List of user IDs that are members of the user group')
});

const action = createAction({
    description: 'List member user IDs for a specific Slack user group',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-user-group-members',
        group: 'User Groups'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['usergroups:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/usergroups.users.list
        const response = await nango.get({
            endpoint: 'usergroups.users.list',
            params: {
                usergroup: input.usergroup_id
            },
            retries: 3
        });

        if (!response.data?.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to list user group members',
                usergroup_id: input.usergroup_id
            });
        }

        return {
            users: response.data.users || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
