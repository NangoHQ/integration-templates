import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    guildId: z.string().describe('Guild ID (Snowflake). Example: "197038439483310086"'),
    name: z.string().describe('Name of the role, max 100 characters. Example: "Moderators"'),
    permissions: z.string().optional().describe('Bitwise value of the enabled/disabled permissions. Example: "66321471"'),
    color: z.number().int().optional().describe('Deprecated RGB color value. Default: 0'),
    colors: z
        .object({
            primary_color: z.number().int(),
            secondary_color: z.number().int().nullable().optional(),
            tertiary_color: z.number().int().nullable().optional()
        })
        .optional()
        .describe('Role colors object with primary, secondary, and tertiary colors'),
    hoist: z.boolean().optional().describe('Whether the role should be displayed separately in the sidebar. Default: false'),
    icon: z.string().nullable().optional().describe("The role's icon image data (if the guild has ROLE_ICONS feature)"),
    unicode_emoji: z.string().nullable().optional().describe("The role's unicode emoji as a standard emoji (if the guild has ROLE_ICONS feature)"),
    mentionable: z.boolean().optional().describe('Whether the role should be mentionable. Default: false')
});

const RoleTagsSchema = z.object({
    bot_id: z.string().optional(),
    integration_id: z.string().optional(),
    premium_subscriber: z.null().optional(),
    subscription_listing_id: z.string().optional(),
    available_for_purchase: z.null().optional(),
    guild_connections: z.null().optional()
});

const RoleColorsSchema = z.object({
    primary_color: z.number().int(),
    secondary_color: z.number().int().nullable(),
    tertiary_color: z.number().int().nullable()
});

const ProviderRoleSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.number().int(),
    colors: RoleColorsSchema,
    hoist: z.boolean(),
    icon: z.string().nullable(),
    unicode_emoji: z.string().nullable(),
    position: z.number().int(),
    permissions: z.string(),
    managed: z.boolean(),
    mentionable: z.boolean(),
    tags: RoleTagsSchema.optional(),
    flags: z.number().int()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.number().int(),
    colors: RoleColorsSchema,
    hoist: z.boolean(),
    icon: z.string().optional(),
    unicode_emoji: z.string().optional(),
    position: z.number().int(),
    permissions: z.string(),
    managed: z.boolean(),
    mentionable: z.boolean(),
    tags: RoleTagsSchema.optional(),
    flags: z.number().int()
});

const MetadataSchema = z.object({
    botToken: z.string()
});

const action = createAction({
    description: 'Create a role in Discord',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-role',
        group: 'Roles'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['guilds', 'bot'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ botToken?: string }>();
        const botToken = metadata?.botToken;

        if (!botToken) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'botToken is required in metadata.'
            });
        }

        // https://discord.com/developers/docs/resources/guild#create-guild-role
        const response = await nango.post({
            endpoint: `/api/v10/guilds/${input.guildId}/roles`,
            headers: {
                Authorization: `Bot ${botToken}`
            },
            data: {
                name: input.name,
                ...(input.permissions !== undefined && { permissions: input.permissions }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.colors !== undefined && { colors: input.colors }),
                ...(input.hoist !== undefined && { hoist: input.hoist }),
                ...(input.icon !== undefined && { icon: input.icon }),
                ...(input.unicode_emoji !== undefined && { unicode_emoji: input.unicode_emoji }),
                ...(input.mentionable !== undefined && { mentionable: input.mentionable })
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create role: no data returned'
            });
        }

        const providerRole = ProviderRoleSchema.parse(response.data);

        return {
            id: providerRole.id,
            name: providerRole.name,
            color: providerRole.color,
            colors: providerRole.colors,
            hoist: providerRole.hoist,
            ...(providerRole.icon != null && { icon: providerRole.icon }),
            ...(providerRole.unicode_emoji != null && { unicode_emoji: providerRole.unicode_emoji }),
            position: providerRole.position,
            permissions: providerRole.permissions,
            managed: providerRole.managed,
            mentionable: providerRole.mentionable,
            ...(providerRole.tags !== undefined && { tags: providerRole.tags }),
            flags: providerRole.flags
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
