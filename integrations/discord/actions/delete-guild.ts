import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    botToken: z.string().describe('Discord bot token from the Discord Developer Portal')
});

const InputSchema = z.object({
    guild_id: z.string().describe('The ID of the guild for the bot to leave.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the bot successfully left the guild'),
    guild_id: z.string().describe('The ID of the guild that was left')
});

const action = createAction({
    description:
        'Leave a guild in Discord. Note: Discord does not allow bots to delete guilds via the API; use this action to have the bot leave a guild instead.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-guild',
        group: 'Guilds'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['guilds'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'botToken is required in metadata. Please configure the bot token in the connection metadata.'
            });
        }

        const botToken = parsedMetadata.data.botToken;

        // Discord does not permit bots to delete guilds via the API.
        // DELETE /users/@me/guilds/{guild_id} is the bot-accessible endpoint to leave a guild.
        // https://discord.com/developers/docs/resources/user#leave-guild
        const response = await nango.delete({
            endpoint: `/api/v10/users/@me/guilds/${input.guild_id}`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 1
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'leave_failed',
                message: `Failed to leave guild. Status: ${response.status}`,
                guild_id: input.guild_id
            });
        }

        return {
            success: true,
            guild_id: input.guild_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
