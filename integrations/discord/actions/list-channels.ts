import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    guild_id: z.string().describe('Guild (server) ID to list channels from. Example: "41771983423143937"')
});

const ChannelSchema = z.object({
    id: z.string(),
    type: z.number(),
    guild_id: z.string().optional(),
    position: z.number().optional(),
    name: z.string().nullable().optional(),
    topic: z.string().nullable().optional(),
    nsfw: z.boolean().optional(),
    last_message_id: z.string().nullable().optional(),
    bitrate: z.number().optional(),
    user_limit: z.number().optional(),
    rate_limit_per_user: z.number().optional(),
    recipients: z.array(z.unknown()).optional(),
    icon: z.string().nullable().optional(),
    owner_id: z.string().optional(),
    application_id: z.string().optional(),
    managed: z.boolean().optional(),
    parent_id: z.string().nullable().optional(),
    last_pin_timestamp: z.string().nullable().optional(),
    rtc_region: z.string().nullable().optional(),
    video_quality_mode: z.number().optional(),
    message_count: z.number().optional(),
    member_count: z.number().optional(),
    default_auto_archive_duration: z.number().optional(),
    permissions: z.string().optional(),
    flags: z.number().optional(),
    total_message_sent: z.number().optional(),
    permission_overwrites: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    channels: z.array(ChannelSchema)
});

const action = createAction({
    description: 'List channels from a Discord guild (server)',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-channels',
        group: 'Channels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['guilds'], // Bot needs guilds scope to access guild channels

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ botToken?: string }>();
        const botToken = metadata?.botToken;

        if (!botToken) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'botToken is required in metadata. Please configure the Discord connection with a bot token from your Discord application settings.'
            });
        }

        // https://discord.com/developers/docs/resources/channel#get-guild-channels
        const response = await nango.get({
            endpoint: `/api/v10/guilds/${input.guild_id}/channels`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 3
        });

        if (!response.data || !Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Discord API',
                guild_id: input.guild_id
            });
        }

        const parsed = ChannelSchema.array().safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Discord channels response',
                guild_id: input.guild_id
            });
        }

        const channels = parsed.data;

        return {
            channels
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
