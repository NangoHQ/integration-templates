import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    guildId: z.string().describe('Guild ID (snowflake). Example: "197038439483310086"')
});

// Discord Guild response - using passthrough to capture all fields
// https://discord.com/developers/docs/resources/guild#guild-object
const ProviderGuildSchema = z.object({}).passthrough();

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Retrieve a single guild from Discord.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-guild',
        group: 'Guilds'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['guilds'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ botToken?: string }>();
        const botToken = metadata?.botToken;

        if (!botToken) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'botToken is required in metadata. Please configure the bot token from Discord Developer Portal.'
            });
        }

        // https://discord.com/developers/docs/resources/guild#get-guild
        const response = await nango.get({
            endpoint: `/api/v10/guilds/${input.guildId}`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Guild not found',
                guildId: input.guildId
            });
        }

        const guild = ProviderGuildSchema.parse(response.data);
        return guild;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
