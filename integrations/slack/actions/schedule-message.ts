import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The channel to post to. Example: "C02MB5ZABA7"'),
    text: z.string().describe('The message text to schedule'),
    post_at: z.number().describe('Unix timestamp for when to post. Example: 1735689600'),
    thread_ts: z.string().optional().describe('Optional thread timestamp to post in a thread. Example: "1234567890.123456"')
});

const OutputSchema = z.object({
    scheduled_message_id: z.string(),
    channel: z.string(),
    post_at: z.number()
});

const action = createAction({
    description: "Schedule a Slack message to a channel or thread, subject to Slack's 120-day scheduling limit.",
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/schedule-message',
        group: 'Messages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.slack.com/methods/chat.scheduleMessage
            endpoint: 'chat.scheduleMessage',
            data: {
                channel: input.channel_id,
                text: input.text,
                post_at: input.post_at,
                ...(input.thread_ts && { thread_ts: input.thread_ts })
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'slack_api_error',
                message: response.data.error || 'Unknown Slack API error',
                error: response.data.error
            });
        }

        return {
            scheduled_message_id: response.data.scheduled_message_id,
            channel: response.data.channel,
            post_at: parseInt(response.data.post_at, 10)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
