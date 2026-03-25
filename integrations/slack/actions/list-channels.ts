import { z } from 'zod';
import { createAction } from 'nango';

const ConversationSchema = z.object({
    id: z.string(),
    name: z.string(),
    created: z.number(),
    creator: z.string(),
    is_archived: z.boolean(),
    is_general: z.boolean(),
    is_private: z.boolean(),
    is_mpim: z.boolean(),
    is_im: z.boolean(),
    num_members: z.number().optional()
});

const InputSchema = z.object({
    types: z
        .string()
        .optional()
        .describe('Comma-separated list of conversation types to filter by. Options: public_channel, private_channel, mpim, im. Default: public_channel.'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    limit: z.number().optional().describe('Maximum number of conversations to return (1-200). Default: 100.')
});

const OutputSchema = z.object({
    conversations: z.array(ConversationSchema),
    next_cursor: z.string().optional(),
    total: z.number()
});

const action = createAction({
    description: 'List Slack conversations with optional type filters and cursor pagination.',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-channels',
        group: 'Conversations'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['channels:read', 'groups:read', 'im:read', 'mpim:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config = {
            // https://api.slack.com/methods/conversations.list
            endpoint: 'conversations.list',
            params: {
                types: input.types || 'public_channel',
                limit: input.limit || 100,
                ...(input.cursor && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const channels = response.data.channels || [];
        const responseMetadata = response.data.response_metadata || {};
        const nextCursor = responseMetadata.next_cursor || undefined;

        const conversations = channels.map((channel: any) => ({
            id: channel.id,
            name: channel.name || '',
            created: channel.created || 0,
            creator: channel.creator || '',
            is_archived: channel.is_archived || false,
            is_general: channel.is_general || false,
            is_private: channel.is_private || false,
            is_mpim: channel.is_mpim || false,
            is_im: channel.is_im || false,
            num_members: channel.num_members
        }));

        return {
            conversations,
            next_cursor: nextCursor,
            total: conversations.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
