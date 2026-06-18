import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    guildId: z.string().describe('The ID of the guild containing the role. Example: "1234567890123456789"'),
    roleId: z.string().describe('The ID of the role to delete. Example: "9876543210987654321"')
});

const ProviderRoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.number().optional(),
    hoist: z.boolean().optional(),
    icon: z.string().nullable().optional(),
    unicode_emoji: z.string().nullable().optional(),
    position: z.number().optional(),
    permissions: z.string().optional(),
    managed: z.boolean().optional(),
    mentionable: z.boolean().optional(),
    flags: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the deleted role'),
    name: z.string().describe('The name of the deleted role'),
    success: z.boolean().describe('Whether the deletion was successful')
});

const action = createAction({
    description: 'Delete a role in a Discord guild',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['guilds'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ botToken?: string }>();
        const botToken = metadata?.botToken;

        if (!botToken) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'botToken is required in metadata. Please provide the Discord bot token from your Discord application settings.'
            });
        }

        // https://discord.com/developers/docs/resources/guild#delete-guild-role
        const response = await nango.delete({
            endpoint: `/api/v10/guilds/${input.guildId}/roles/${input.roleId}`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 3
        });

        // Discord returns 204 No Content on successful deletion
        // If the API returns the role object (older behavior), parse it
        const roleData = response.data ? ProviderRoleSchema.parse(response.data) : null;

        return {
            id: input.roleId,
            name: roleData?.name || 'Unknown',
            success: response.status === 204 || response.status === 200
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
