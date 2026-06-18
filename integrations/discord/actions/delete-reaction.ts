import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z.string().describe('The ID of the channel containing the message. Example: "123456789012345678"'),
    message_id: z.string().describe('The ID of the message to remove the reaction from. Example: "987654321098765432"'),
    emoji: z.string().describe('The emoji to remove. Provide the raw emoji character or name:id for custom emojis. Example: "👍" or "emojiName:123456789"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a reaction from a Discord message.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['guilds', 'bot'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ botToken?: string }>();
        const botToken = metadata?.botToken;

        if (!botToken) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'botToken is required in metadata. Please configure the bot token from Discord Developer Portal.'
            });
        }

        // https://discord.com/developers/docs/resources/channel#delete-own-reaction
        // DELETE /channels/{channel.id}/messages/{message.id}/reactions/{emoji}/@me
        await nango.delete({
            endpoint: `/api/v10/channels/${input.channel_id}/messages/${input.message_id}/reactions/${encodeURIComponent(input.emoji)}/@me`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 10
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
