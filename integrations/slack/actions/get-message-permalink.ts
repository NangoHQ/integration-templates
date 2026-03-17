import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The ID of the conversation or channel containing the message. Example: "C123ABC456"'),
    message_ts: z.string().describe('The timestamp of the message, uniquely identifying it within a channel. Example: "1358546515.000008"')
});

const OutputSchema = z.object({
    permalink: z.string().describe('The permalink URL for the message')
});

const action = createAction({
    description: 'Get a permanent URL for a message',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-message-permalink',
        group: 'Messages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/chat.getPermalink
        const response = await nango.get({
            endpoint: 'chat.getPermalink',
            params: {
                channel: input.channel_id,
                message_ts: input.message_ts
            },
            retries: 3
        });

        if (!response.data || !response.data.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data?.error || 'Failed to get message permalink',
                channel_id: input.channel_id,
                message_ts: input.message_ts
            });
        }

        return {
            permalink: response.data.permalink
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
