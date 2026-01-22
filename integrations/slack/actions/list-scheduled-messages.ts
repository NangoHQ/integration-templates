/**
 * Instructions: Retrieves pending scheduled messages from workspace.
 * API: https://api.slack.com/methods/chat.scheduledMessages.list
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ListScheduledMessagesInput = z.object({
    channel_id: z.string().optional().describe('Filter by channel. Example: "C02MB5ZABA7"'),
    latest_ts: z.number().optional().describe('Only include messages before this timestamp. Example: 1234567890'),
    oldest_ts: z.number().optional().describe('Only include messages after this timestamp. Example: 1234567890')
});

const SlackScheduledMessageSchema = z.object({
    id: z.string(),
    channel_id: z.string(),
    post_at: z.number(),
    date_created: z.number(),
    text: z.string().optional()
});

const ListScheduledMessagesOutput = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    scheduled_messages: z.array(SlackScheduledMessageSchema).describe('Array of scheduled message objects')
});

const action = createAction({
    description: 'Retrieves pending scheduled messages from workspace.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/messages/scheduled',
        group: 'Messages'
    },

    input: ListScheduledMessagesInput,
    output: ListScheduledMessagesOutput,
    scopes: ['chat:write'],

    exec: async (nango, input): Promise<z.infer<typeof ListScheduledMessagesOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/chat.scheduledMessages.list
            endpoint: 'chat.scheduledMessages.list',
            params: {
                ...(input.channel_id && { channel: input.channel_id }),
                ...(input.latest_ts && { latest: input.latest_ts.toString() }),
                ...(input.oldest_ts && { oldest: input.oldest_ts.toString() })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            ok: response.data.ok,
            scheduled_messages: response.data.scheduled_messages
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
