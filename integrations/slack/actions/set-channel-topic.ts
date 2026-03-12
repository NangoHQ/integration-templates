import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The ID of the channel to set the topic for. Example: "C12345678"'),
    topic: z.string().describe('The new topic string. Does not support formatting or linkification. Example: "Apply topically for best effects"')
});

const OutputSchema = z.object({
    ok: z.boolean(),
    channel: z.record(z.string(), z.any()),
    warning: z.string().optional(),
    response_metadata: z.record(z.string(), z.any()).optional()
});

const action = createAction({
    description: 'Set the topic of a channel',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/set-channel-topic',
        group: 'Channels'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:write.topic', 'groups:write.topic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.slack.com/methods/conversations.setTopic
            endpoint: '/conversations.setTopic',
            data: {
                channel: input.channel_id,
                topic: input.topic
            },
            retries: 3
        });

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
