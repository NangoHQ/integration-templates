import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    botToken: z.string().describe('Discord bot token for authentication')
});

const InputSchema = z.object({
    guild_id: z.string().describe('Guild ID. Example: "123456789012345678"'),
    user_id: z.string().describe('User ID of the member to delete. Example: "987654321098765432"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete or archive a guild member in Discord',
    version: '1.0.0',
    metadata: MetadataSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/delete-guild-member',
        group: 'Guild Members'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['guilds.members.read', 'guilds.members.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{
            botToken?: string;
        }>();

        if (!metadata?.botToken) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'botToken is required in connection metadata'
            });
        }

        // https://discord.com/developers/docs/resources/guild#remove-guild-member
        const response = await nango.delete({
            endpoint: `/api/v10/guilds/${input.guild_id}/members/${input.user_id}`,
            headers: {
                Authorization: `Bot ${metadata.botToken}`
            },
            retries: 1
        });

        // Discord returns 204 No Content on successful deletion
        // 404 means the user is not a member of the guild
        if (response.status === 204) {
            return {
                success: true,
                message: `Member ${input.user_id} successfully removed from guild ${input.guild_id}`
            };
        }

        if (response.status === 404) {
            return {
                success: false,
                message: `User ${input.user_id} is not a member of guild ${input.guild_id}`
            };
        }

        return {
            success: false,
            message: `Unexpected response status: ${response.status}`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
