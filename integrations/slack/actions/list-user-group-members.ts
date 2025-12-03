/**
 * Instructions: Lists users within a specific user group. API: https://api.slack.com/methods/usergroups.users.list. Input: usergroup: string. Output: ok: boolean, users: array.
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ListUserGroupMembersInput = z.object({
    usergroup: z.string()
        .describe('The user group ID to get members for. Example: "S0614TZR7"')
});

const ListUserGroupMembersOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    users: z.array(z.string())
        .describe('Array of user IDs in the group')
});

const action = createAction({
    description: 'Lists users within a specific user group.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/user-group-members',
        group: 'User Groups'
    },

    input: ListUserGroupMembersInput,
    output: ListUserGroupMembersOutput,
    scopes: ['usergroups:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListUserGroupMembersOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/usergroups.users.list
            endpoint: 'usergroups.users.list',
            params: {
                usergroup: input.usergroup
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            users: response.data.users
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
