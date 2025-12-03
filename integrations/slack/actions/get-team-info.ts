/**
 * Instructions: Retrieves information about the workspace
 * API: https://api.slack.com/methods/team.info
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    team: z.any()
        .describe('The team object with workspace details like name, domain, icon')
});

const action = createAction({
    description: 'Retrieves information about the workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/get-team-info',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['team:read'],
    exec: async (nango, _input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/team.info
            endpoint: 'team.info',
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            team: response.data.team
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
