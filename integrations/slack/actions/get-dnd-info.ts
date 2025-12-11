/**
 * Instructions: Gets Do Not Disturb settings for a user
 * API: https://api.slack.com/methods/dnd.info
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    user_id: z.string().optional().describe('User to get DND info for. Defaults to current user. Example: "U02MDCKS1N0"')
});

const Output = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    dnd_enabled: z.boolean().describe('Whether DND is currently enabled'),
    next_dnd_start_ts: z.number().describe('Unix timestamp when next DND period starts'),
    next_dnd_end_ts: z.number().describe('Unix timestamp when next DND period ends')
});

const action = createAction({
    description: 'Gets Do Not Disturb settings for a user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/get-dnd-info',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['dnd:read'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/dnd.info
            endpoint: 'dnd.info',
            params: {
                ...(input.user_id && { user: input.user_id })
            },
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            dnd_enabled: response.data.dnd_enabled,
            next_dnd_start_ts: response.data.next_dnd_start_ts,
            next_dnd_end_ts: response.data.next_dnd_end_ts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
