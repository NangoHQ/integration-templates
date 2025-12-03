/**
 * Instructions: Lists all user groups in the workspace
 * API: https://api.slack.com/methods/usergroups.list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    include_disabled: z.boolean().optional()
        .describe('Include disabled user groups. Default: false'),
    include_count: z.boolean().optional()
        .describe('Include member counts. Default: false')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    usergroups: z.array(z.any())
        .describe('Array of user group objects')
});

const action = createAction({
    description: 'Lists all user groups in the workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/list-user-groups',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['usergroups:read'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            endpoint: 'usergroups.list',
            params: {
                ...(input.include_disabled !== undefined && { include_disabled: input.include_disabled.toString() }),
                ...(input.include_count !== undefined && { include_count: input.include_count.toString() })
            },
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            usergroups: response.data.usergroups
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
