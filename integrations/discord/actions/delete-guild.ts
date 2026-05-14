import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    botToken: z.string().describe('Discord bot token from the Discord Developer Portal')
});

const InputSchema = z.object({
    guild_id: z.string().describe('The ID of the guild to delete. The bot must be the owner of the guild.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the guild was successfully deleted'),
    guild_id: z.string().describe('The ID of the deleted guild')
});

const action = createAction({
    description: 'Delete or archive a guild in Discord',
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

        // https://discord.com/developers/docs/resources/guild#delete-guild
        const response = await nango.delete({
            endpoint: `/api/v10/guilds/${input.guild_id}`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 1
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete guild. Status: ${response.status}`,
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
