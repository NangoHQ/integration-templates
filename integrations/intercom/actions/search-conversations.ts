import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z
        .object({
            field: z.string().optional().describe('The field to filter on. Example: "state"'),
            operator: z.string().optional().describe('The comparison operator. Example: "="'),
            value: z
                .union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))])
                .optional()
                .describe('The value to filter by')
        })
        .passthrough()
        .describe('A simple filter query'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response'),
    per_page: z.number().min(1).max(150).optional().describe('Number of results per page (max 150)')
});

const ConversationListItemSchema = z
    .object({
        type: z.literal('conversation').optional(),
        id: z.string().describe('The conversation ID'),
        title: z.string().nullable().optional(),
        created_at: z.number().optional().describe('Unix timestamp of creation time'),
        updated_at: z.number().optional().describe('Unix timestamp of last update'),
        waiting_since: z.number().nullable().optional().describe('Unix timestamp when customer started waiting'),
        snoozed_until: z.number().nullable().optional().describe('Unix timestamp when snooze ends'),
        open: z.boolean().optional().describe('Whether the conversation is open'),
        state: z.enum(['open', 'closed', 'snoozed']).optional().describe('Conversation state'),
        read: z.boolean().optional().describe('Whether the conversation has been read'),
        priority: z.enum(['priority', 'not_priority']).optional().describe('Priority status'),
        admin_assignee_id: z.number().nullable().optional().describe('ID of assigned admin'),
        team_assignee_id: z.number().nullable().optional().describe('ID of assigned team')
    })
    .passthrough();

const PagesSchema = z.object({
    type: z.string().optional(),
    page: z.number().optional(),
    per_page: z.number().optional(),
    total_pages: z.number().optional(),
    next: z
        .object({
            page: z.number().optional(),
            starting_after: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    conversations: z.array(z.unknown()).optional(),
    total_count: z.number().optional(),
    pages: PagesSchema.optional()
});

const OutputSchema = z.object({
    conversations: z.array(ConversationListItemSchema).describe('List of matching conversations'),
    total_count: z.number().describe('Total number of matching conversations'),
    next_cursor: z.string().optional().describe('Cursor for the next page of results')
});

const action = createAction({
    description: 'Search conversations with a structured filter query',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-conversations',
        group: 'Conversations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_conversations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            query: input.query
        };

        const pagination: Record<string, unknown> = {};
        if (input.per_page) {
            pagination['per_page'] = input.per_page;
        }
        if (input.cursor) {
            pagination['starting_after'] = input.cursor;
        }
        if (Object.keys(pagination).length > 0) {
            body['pagination'] = pagination;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/SearchConversations
        const response = await nango.post({
            endpoint: '/conversations/search',
            headers: {
                'Intercom-Version': '2.11'
            },
            data: body,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Intercom API'
            });
        }

        const validatedResponse = ProviderResponseSchema.parse(response.data);
        const nextCursor = validatedResponse.pages?.next?.starting_after;
        const rawConversations = validatedResponse.conversations || [];
        const conversations = rawConversations.map((conv) => ConversationListItemSchema.parse(conv));

        return {
            conversations,
            total_count: validatedResponse.total_count || conversations.length,
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
