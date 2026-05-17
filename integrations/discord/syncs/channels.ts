import { createSync } from 'nango';
import { z } from 'zod';

const ChannelSchema = z.object({
    id: z.string(),
    guild_id: z.string().optional(),
    name: z.string().optional(),
    type: z.number(),
    topic: z.string().optional(),
    position: z.number().optional(),
    parent_id: z.string().optional(),
    nsfw: z.boolean().optional(),
    rate_limit_per_user: z.number().optional(),
    bitrate: z.number().optional(),
    user_limit: z.number().optional(),
    rtc_region: z.string().optional(),
    last_message_id: z.string().optional(),
    flags: z.number().optional()
});

const MetadataSchema = z.object({
    botToken: z.string(),
    guildId: z.string()
});

const ProviderChannelSchema = z.object({
    id: z.string(),
    guild_id: z.string().nullish(),
    name: z.string().nullish(),
    type: z.number(),
    topic: z.string().nullish(),
    position: z.number().nullish(),
    parent_id: z.string().nullish(),
    nsfw: z.boolean().nullish(),
    rate_limit_per_user: z.number().nullish(),
    bitrate: z.number().nullish(),
    user_limit: z.number().nullish(),
    rtc_region: z.string().nullish(),
    last_message_id: z.string().nullish(),
    flags: z.number().nullish()
});

const sync = createSync({
    description: 'Sync channels from Discord',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    models: {
        Channel: ChannelSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/channels'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Missing required metadata: botToken and guild_id are required');
        }

        const { botToken, guildId } = parsedMetadata.data;

        // https://discord.com/developers/docs/resources/guild#get-guild-channels
        // Blocker: Discord GET /guilds/{guild.id}/channels returns all channels
        // in a single response with no pagination parameters, no updated_at
        // timestamps, and no changed-since or cursor filters.
        const response = await nango.get({
            endpoint: `/api/v10/guilds/${guildId}/channels`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new Error('Unexpected response format: expected array of channels');
        }

        await nango.trackDeletesStart('Channel');

        try {
            const channels = [];
            for (const raw of response.data) {
                const parsed = ProviderChannelSchema.safeParse(raw);
                if (!parsed.success) {
                    continue;
                }

                const channel = parsed.data;
                channels.push({
                    id: channel.id,
                    ...(channel.guild_id != null && { guild_id: channel.guild_id }),
                    ...(channel.name != null && { name: channel.name }),
                    type: channel.type,
                    ...(channel.topic != null && { topic: channel.topic }),
                    ...(channel.position != null && { position: channel.position }),
                    ...(channel.parent_id != null && { parent_id: channel.parent_id }),
                    ...(channel.nsfw != null && { nsfw: channel.nsfw }),
                    ...(channel.rate_limit_per_user != null && { rate_limit_per_user: channel.rate_limit_per_user }),
                    ...(channel.bitrate != null && { bitrate: channel.bitrate }),
                    ...(channel.user_limit != null && { user_limit: channel.user_limit }),
                    ...(channel.rtc_region != null && { rtc_region: channel.rtc_region }),
                    ...(channel.last_message_id != null && { last_message_id: channel.last_message_id }),
                    ...(channel.flags != null && { flags: channel.flags })
                });
            }

            if (channels.length > 0) {
                await nango.batchSave(channels, 'Channel');
            }
        } finally {
            await nango.trackDeletesEnd('Channel');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
