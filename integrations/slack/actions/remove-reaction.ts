/**
 * Instructions: Removes an emoji reaction from a message
 * API: https://api.slack.com/methods/reactions.remove
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const RemoveReactionInput = z.object({
    channel_id: z.string()
        .describe('The channel containing the message. Example: "C02MB5ZABA7"'),
    message_ts: z.string()
        .describe('Timestamp of the message. Example: "1234567890.123456"'),
    reaction_name: z.string()
        .describe('The emoji name without colons. Example: "thumbsup"')
});

const RemoveReactionOutput = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful')
});

const action = createAction({
    description: 'Removes an emoji reaction from a message.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/reactions/remove',
        group: 'Reactions'
    },
    input: RemoveReactionInput,
    output: RemoveReactionOutput,
    scopes: ['reactions:write'],
    exec: async (nango, input): Promise<z.infer<typeof RemoveReactionOutput>> => {
        const config: ProxyConfiguration = {
            endpoint: 'reactions.remove',
            data: {
                channel: input.channel_id,
                timestamp: input.message_ts,
                name: input.reaction_name
            },
            retries: 3
        };
        const response = await nango.post(config);
        return { ok: response.data.ok };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
