import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    after: z.string().optional().describe('Get guilds after this guild ID. Omit for the first page, or use the next_cursor from the previous response.'),
    limit: z.number().min(1).max(200).optional().describe('Maximum number of guilds to return (1-200, default: 200).')
});

const GuildSchema = z.object({
    id: z.string().describe('Guild ID.'),
    name: z.string().describe('Guild name.'),
    icon: z.string().nullable().describe('Icon hash or null.'),
    owner: z.boolean().describe('Whether the user is the owner of the guild.'),
    features: z.array(z.string()).describe('Enabled guild features.'),
    permissions: z.string().optional().describe('Permissions for the user in the guild.'),
    approximate_member_count: z.number().optional().describe('Approximate number of members in the guild (if with_counts enabled).'),
    approximate_presence_count: z.number().optional().describe('Approximate number of online members (if with_counts enabled).')
});

const OutputSchema = z.object({
    items: z.array(GuildSchema).describe('List of guilds.'),
    next_cursor: z.string().optional().describe('Cursor for the next page of results. Omit if there are no more pages.')
});

const action = createAction({
    description: 'List guilds from Discord.',
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
                message: 'botToken is required in metadata.'
            });
        }

        const limit = input.limit ?? 200;

        // https://discord.com/developers/docs/resources/user#get-current-user-guilds
        const response = await nango.get({
            endpoint: '/api/v10/users/@me/guilds',
            headers: {
                Authorization: `Bot ${botToken}`
            },
            params: {
                limit: String(limit),
                ...(input.after && { after: input.after })
            },
            retries: 3
        });

        const guilds = z.array(GuildSchema).parse(response.data);

        const nextCursor = guilds.length === limit ? guilds[guilds.length - 1]?.id : undefined;

        return {
            items: guilds,
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
