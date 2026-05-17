import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    botToken: z.string(),
    channelId: z.string()
});

const DiscordWebhookSchema = z.object({
    id: z.string(),
    type: z.number().int(),
    guild_id: z.string().nullable().optional(),
    channel_id: z.string().nullable(),
    user: z
        .object({
            id: z.string().optional(),
            username: z.string().optional()
        })
        .optional(),
    name: z.string().nullable(),
    avatar: z.string().nullable(),
    token: z.string().optional(),
    application_id: z.string().nullable(),
    source_guild: z
        .object({
            id: z.string(),
            name: z.string(),
            icon: z.string().nullable().optional()
        })
        .optional(),
    source_channel: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    url: z.string().optional()
});

const WebhookSchema = z.object({
    id: z.string(),
    type: z.number().int(),
    name: z.string().optional(),
    channel_id: z.string().optional(),
    guild_id: z.string().optional(),
    avatar: z.string().optional(),
    application_id: z.string().optional(),
    user_id: z.string().optional(),
    user_name: z.string().optional(),
    source_guild_id: z.string().optional(),
    source_guild_name: z.string().optional(),
    source_channel_id: z.string().optional(),
    source_channel_name: z.string().optional()
});

const sync = createSync({
    description: 'Sync webhooks from Discord.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/webhooks' }],
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Webhook: WebhookSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            await nango.log('Missing or invalid metadata: botToken and channelId are required');
            return;
        }
        const metadata = metadataResult.data;

        const proxyConfig: ProxyConfiguration = {
            // https://discord.com/developers/docs/resources/webhook#get-channel-webhooks
            endpoint: `/api/v10/channels/${metadata.channelId}/webhooks`,
            headers: {
                Authorization: `Bot ${metadata.botToken}`
            },
            // Discord does not paginate the Get Channel Webhooks endpoint; configure
            // cursor pagination so the request yields a single page and stops cleanly.
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'nonexistent.path'
            },
            retries: 3
        };

        // Blocker: Discord Get Channel Webhooks returns all webhooks with no
        // changed-since filter, no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('Webhook');

        try {
            for await (const batch of nango.paginate(proxyConfig)) {
                if (!Array.isArray(batch)) {
                    await nango.log('Unexpected response format: expected array of webhooks');
                    continue;
                }

                const webhooks = [];
                for (const raw of batch) {
                    const parsed = DiscordWebhookSchema.safeParse(raw);
                    if (!parsed.success) {
                        await nango.log('Skipping invalid webhook record', parsed.error);
                        continue;
                    }
                    const webhook = parsed.data;
                    webhooks.push({
                        id: webhook.id,
                        type: webhook.type,
                        ...(webhook.name != null && { name: webhook.name }),
                        ...(webhook.channel_id != null && { channel_id: webhook.channel_id }),
                        ...(webhook.guild_id != null && { guild_id: webhook.guild_id }),
                        ...(webhook.avatar != null && { avatar: webhook.avatar }),
                        ...(webhook.application_id != null && { application_id: webhook.application_id }),
                        ...(webhook.user?.id != null && { user_id: webhook.user.id }),
                        ...(webhook.user?.username != null && { user_name: webhook.user.username }),
                        ...(webhook.source_guild?.id != null && { source_guild_id: webhook.source_guild.id }),
                        ...(webhook.source_guild?.name != null && { source_guild_name: webhook.source_guild.name }),
                        ...(webhook.source_channel?.id != null && { source_channel_id: webhook.source_channel.id }),
                        ...(webhook.source_channel?.name != null && { source_channel_name: webhook.source_channel.name })
                    });
                }

                if (webhooks.length > 0) {
                    await nango.batchSave(webhooks, 'Webhook');
                }
            }
        } finally {
            await nango.trackDeletesEnd('Webhook');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
