/**
 * Instructions: Adds an emoji reaction to a message
 * API: https://api.slack.com/methods/reactions.add
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const AddReactionInput = z.object({
    channel_id: z.string()
        .describe('The channel containing the message. Example: "C02MB5ZABA7"'),
    message_ts: z.string()
        .describe('Timestamp of the message to react to in "seconds.microseconds" format. Example: "1763887648.424429"'),
    reaction_name: z.string()
        .describe('Emoji name without colons. Example: "thumbsup", "heart", "eyes"')
});

const AddReactionOutput = z.object({
    ok: z.boolean()
        .describe('Whether the reaction was added successfully')
});

const action = createAction({
    description: 'Adds an emoji reaction to a message.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/reactions',
        group: 'Reactions'
    },
    input: AddReactionInput,
    output: AddReactionOutput,
    scopes: ['reactions:write'],
    exec: async (nango, input): Promise<z.infer<typeof AddReactionOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/reactions.add
            endpoint: 'reactions.add',
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
