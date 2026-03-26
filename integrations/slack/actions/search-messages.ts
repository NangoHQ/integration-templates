import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Search query string. Example: "pickleface"'),
    count: z.number().optional().describe('Number of results per page. Maximum 100. Default: 20'),
    cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from previous response. Use "*" for first page, then use next_cursor from response for subsequent pages'),
    highlight: z.boolean().optional().describe('Enable query highlight markers in results. Default: false'),
    sort: z.enum(['score', 'timestamp']).optional().describe('Sort matches by score or timestamp. Default: score'),
    sort_dir: z.enum(['asc', 'desc']).optional().describe('Sort direction: ascending or descending. Default: desc'),
    team_id: z.string().optional().describe('Encoded team ID to search in, required if org token is used')
});

const MessageSchema = z.object({
    iid: z.string().describe('Internal ID of the message'),
    team: z.string().describe('Team ID'),
    channel: z.object({
        id: z.string().describe('Channel ID'),
        name: z.string().describe('Channel name'),
        is_private: z.boolean().describe('Whether the channel is private'),
        is_mpim: z.boolean().describe('Whether the channel is a multiparty IM'),
        is_ext_shared: z.boolean().describe('Whether the channel is externally shared'),
        is_org_shared: z.boolean().describe('Whether the channel is organization shared'),
        is_shared: z.boolean().describe('Whether the channel is shared'),
        is_pending_ext_shared: z.boolean().describe('Whether external sharing is pending'),
        pending_shared: z.array(z.string()).describe('List of pending shared IDs')
    }),
    type: z.string().describe('Message type'),
    user: z.string().describe('User ID of the sender'),
    username: z.string().describe('Username of the sender'),
    ts: z.string().describe('Message timestamp'),
    text: z.string().describe('Message text content'),
    permalink: z.string().describe('Permanent link to the message')
});

const OutputSchema = z.object({
    messages: z.array(MessageSchema).describe('Array of matching messages'),
    total: z.number().describe('Total number of matching messages'),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page, or omitted if no more results')
});

const action = createAction({
    description: 'Search for messages matching a query',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/search-messages',
        group: 'Messages'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['search:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.slack.com/methods/search.messages
        const response = await nango.get({
            endpoint: 'search.messages',
            params: {
                query: input.query,
                ...(input.count !== undefined && { count: input.count }),
                ...(input.cursor && { cursor: input.cursor }),
                ...(input.highlight !== undefined && { highlight: input.highlight ? 'true' : 'false' }),
                ...(input.sort && { sort: input.sort }),
                ...(input.sort_dir && { sort_dir: input.sort_dir }),
                ...(input.team_id && { team_id: input.team_id })
            },
            retries: 3
        });

        if (!response.data.ok) {
            throw new nango.ActionError({
                type: 'api_error',
                message: response.data.error || 'Slack API returned an error'
            });
        }

        const matches = response.data.messages?.matches || [];
        const total = response.data.messages?.total || 0;
        const nextCursor = response.data.messages?.pagination?.next_cursor || undefined;

        const messages = matches.map((match: any) => ({
            iid: match.iid || '',
            team: match.team || '',
            channel: {
                id: match.channel?.id || '',
                name: match.channel?.name || '',
                is_private: match.channel?.is_private || false,
                is_mpim: match.channel?.is_mpim || false,
                is_ext_shared: match.channel?.is_ext_shared || false,
                is_org_shared: match.channel?.is_org_shared || false,
                is_shared: match.channel?.is_shared || false,
                is_pending_ext_shared: match.channel?.is_pending_ext_shared || false,
                pending_shared: match.channel?.pending_shared || []
            },
            type: match.type || '',
            user: match.user || '',
            username: match.username || '',
            ts: match.ts || '',
            text: match.text || '',
            permalink: match.permalink || ''
        }));

        return {
            messages,
            total,
            next_cursor: nextCursor || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
