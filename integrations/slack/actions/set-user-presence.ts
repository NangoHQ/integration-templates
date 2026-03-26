import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    presence: z.enum(['online', 'away']).describe('User presence status. Use "online" to set presence to auto (active) or "away" to set presence to away.')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the presence was set successfully'),
    error: z.string().optional().describe('Error message if the request failed')
});

const action = createAction({
    description: "Set a user's presence to online or away",
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/set-user-presence',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/users.setPresence
        // Map "online" to "auto" (Slack's term for activity-based presence)
        const presenceValue = input.presence === 'online' ? 'auto' : 'away';

        const response = await nango.post({
            endpoint: 'users.setPresence',
            data: {
                presence: presenceValue
            },
            retries: 3
        });

        if (!response.data || response.data.ok !== true) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to set user presence',
                presence: input.presence
            });
        }

        return {
            ok: response.data.ok,
            error: response.data.error || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
