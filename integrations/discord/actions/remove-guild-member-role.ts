import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    guild_id: z.string().describe('Guild ID. Example: "123456789"'),
    user_id: z.string().describe('User ID of the member. Example: "987654321"'),
    role_id: z.string().describe('Role ID to remove from the member. Example: "456789123"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    guild_id: z.string(),
    user_id: z.string(),
    role_id: z.string()
});

const action = createAction({
    description: 'Remove a role from a guild member',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['guilds.members.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ botToken: string }>();
        const botToken = metadata?.botToken;

        if (!botToken) {
            throw new nango.ActionError({
                type: 'missing_bot_token',
                message: 'Bot token is required in metadata. Please configure the botToken in your connection metadata.'
            });
        }

        // https://discord.com/developers/docs/resources/guild#delete-guild-member-role
        const response = await nango.delete({
            endpoint: `/api/v10/guilds/${input.guild_id}/members/${input.user_id}/roles/${input.role_id}`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Failed to remove role: Discord API returned status ${response.status}`,
                guild_id: input.guild_id,
                user_id: input.user_id,
                role_id: input.role_id
            });
        }

        return {
            success: true,
            guild_id: input.guild_id,
            user_id: input.user_id,
            role_id: input.role_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
