/**
 * Instructions: Schedules a message for future delivery up to 120 days ahead.
 * API: https://api.slack.com/methods/chat.scheduleMessage
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ScheduleMessageInput = z.object({
    channel_id: z.string()
        .describe('The channel to post to. Example: "C02MB5ZABA7"'),
    text: z.string()
        .describe('The message text. Example: "Hello, world!"'),
    post_at: z.number()
        .describe('Unix timestamp for when to post. Example: 1735689600'),
    thread_ts: z.string().optional()
        .describe('Timestamp of thread to reply to. Example: "1234567890.123456"')
});

const ScheduleMessageOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    scheduled_message_id: z.string()
        .describe('The ID of the scheduled message'),
    post_at: z.number()
        .describe('Unix timestamp when the message will be posted')
});

const action = createAction({
    description: 'Schedules a message for future delivery up to 120 days ahead.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/messages/schedule',
        group: 'Messages'
    },

    input: ScheduleMessageInput,
    output: ScheduleMessageOutput,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof ScheduleMessageOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/chat.scheduleMessage
            endpoint: 'chat.scheduleMessage',
            data: {
                channel: input.channel_id,
                text: input.text,
                post_at: input.post_at,
                ...(input.thread_ts && { thread_ts: input.thread_ts })
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            ok: response.data.ok,
            scheduled_message_id: response.data.scheduled_message_id,
            post_at: response.data.post_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
