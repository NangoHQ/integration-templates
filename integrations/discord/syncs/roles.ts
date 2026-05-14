import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    botToken: z.string(),
    guildId: z.string()
});

const RoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.number().optional(),
    colors: z
        .object({
            primary_color: z.number(),
            secondary_color: z.number().nullable().optional(),
            tertiary_color: z.number().nullable().optional()
        })
        .optional(),
    hoist: z.boolean().optional(),
    icon: z.string().optional(),
    unicode_emoji: z.string().optional(),
    position: z.number().optional(),
    permissions: z.string().optional(),
    managed: z.boolean().optional(),
    mentionable: z.boolean().optional(),
    flags: z.number().optional()
});

const ProviderRoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.number(),
    colors: z
        .object({
            primary_color: z.number(),
            secondary_color: z.number().nullable().optional(),
            tertiary_color: z.number().nullable().optional()
        })
        .optional(),
    hoist: z.boolean(),
    icon: z.string().nullable(),
    unicode_emoji: z.string().nullable(),
    position: z.number(),
    permissions: z.string(),
    managed: z.boolean(),
    mentionable: z.boolean(),
    tags: z
        .object({
            bot_id: z.string().optional(),
            integration_id: z.string().optional(),
            premium_subscriber: z.null().optional(),
            subscription_listing_id: z.string().optional(),
            available_for_purchase: z.null().optional(),
            guild_connections: z.null().optional()
        })
        .optional(),
    flags: z.number()
});

const sync = createSync({
    description: 'Sync roles from Discord',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Role: RoleSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/roles'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            await nango.log('Invalid metadata: missing botToken or guild identifier', { level: 'error' });
            return;
        }

        const guildId = parsedMetadata.data.guildId;

        const proxyConfig: ProxyConfiguration = {
            // https://discord.com/developers/docs/resources/guild#get-guild-roles
            endpoint: `/api/v10/guilds/${guildId}/roles`,
            headers: {
                Authorization: `Bot ${parsedMetadata.data.botToken}`
            },
            retries: 3
        };

        const response = await nango.get(proxyConfig);

        const parsed = z.array(ProviderRoleSchema).safeParse(response.data);
        if (!parsed.success) {
            await nango.log('Invalid response from Discord roles endpoint', { level: 'error' });
            return;
        }

        await nango.trackDeletesStart('Role');

        try {
            const roles = parsed.data.map((role) => ({
                id: role.id,
                name: role.name,
                ...(role.color !== undefined && { color: role.color }),
                ...(role.colors !== undefined && { colors: role.colors }),
                ...(role.hoist !== undefined && { hoist: role.hoist }),
                ...(role.icon !== null && { icon: role.icon }),
                ...(role.unicode_emoji !== null && { unicode_emoji: role.unicode_emoji }),
                ...(role.position !== undefined && { position: role.position }),
                ...(role.permissions !== undefined && { permissions: role.permissions }),
                ...(role.managed !== undefined && { managed: role.managed }),
                ...(role.mentionable !== undefined && { mentionable: role.mentionable }),
                ...(role.flags !== undefined && { flags: role.flags })
            }));

            if (roles.length > 0) {
                await nango.batchSave(roles, 'Role');
            }
        } finally {
            await nango.trackDeletesEnd('Role');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
