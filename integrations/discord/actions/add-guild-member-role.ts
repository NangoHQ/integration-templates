import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    botToken: z.string()
});

const InputSchema = z.object({
    guildId: z.string().describe('Guild ID. Example: "123456789012345678"'),
    userId: z.string().describe('User ID. Example: "987654321098765432"'),
    roleId: z.string().describe('Role ID. Example: "111222333444555666"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Assign a role to a guild member.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['guilds.members.edit'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadataResult = MetadataSchema.safeParse(await nango.getMetadata());

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'botToken is required in metadata.'
            });
        }

        const { botToken } = metadataResult.data;

        // https://discord.com/developers/docs/resources/guild#add-guild-member-role
        const response = await nango.put({
            endpoint: `/api/v10/guilds/${input.guildId}/members/${input.userId}/roles/${input.roleId}`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Failed to assign role. Status: ${response.status}`
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
