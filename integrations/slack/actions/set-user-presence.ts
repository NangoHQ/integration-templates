/**
 * Instructions: Sets the calling users manual presence status
 * API: https://api.slack.com/methods/users.setPresence
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const SetUserPresenceInput = z.object({
    presence: z.string().describe('The presence status to set: "auto" or "away". Example: "away"')
});

const SetUserPresenceOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful')
});

const action = createAction({
    description: "Sets the calling user's manual presence status.",
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/users/presence',
        group: 'Users'
    },
    input: SetUserPresenceInput,
    output: SetUserPresenceOutput,
    scopes: ['users:write'],
    exec: async (nango, input): Promise<z.infer<typeof SetUserPresenceOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/users.setPresence
            endpoint: 'users.setPresence',
            data: {
                presence: input.presence
            },
            retries: 3
        };
        const response = await nango.post(config);
        return {
            ok: response.data.ok
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
