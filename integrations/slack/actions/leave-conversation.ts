import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The ID of the channel to leave. Example: "C1234567890"')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    error: z.string().optional().describe('Error message if the request failed')
});

const action = createAction({
    description: 'Leave a channel',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/leave-conversation',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:write', 'groups:write', 'im:write', 'mpim:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.dev/methods/conversations.leave
        const response = await nango.post({
            endpoint: 'conversations.leave',
            data: {
                channel: input.channel_id
            },
            retries: 3
        });

        return {
            ok: response.data.ok ?? false,
            error: response.data.error ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
