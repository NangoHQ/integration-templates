import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The ID of the channel to archive. Example: "C1234567890"')
});

const OutputSchema = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    error: z.string().optional().describe('Error message if the request failed')
});

const action = createAction({
    description: 'Archive a Slack channel',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/archive-channel',
        group: 'Channels'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:manage', 'channels:write', 'groups:write', 'im:write', 'mpim:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.slack.com/methods/conversations.archive
            endpoint: 'conversations.archive',
            data: {
                channel: input.channel_id
            },
            retries: 3
        });

        return {
            ok: response.data.ok,
            error: response.data.error
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
