import * as z from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional(),
    per_page: z.number().int().min(1).max(150).optional(),
    state: z.enum(['open', 'closed', 'snoozed']).optional()
});

const ConversationPartSchema = z.object({
    id: z.string(),
    type: z.string(),
    body: z.string().nullable().optional(),
    created_at: z.number(),
    updated_at: z.number()
});

const ConversationPartsSchema = z.object({
    type: z.string(),
    conversation_parts: z.array(ConversationPartSchema)
});

const ConversationSchema = z.object({
    id: z.string(),
    type: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
    state: z.enum(['open', 'closed', 'snoozed']),
    title: z.string().nullable().optional(),
    source: z.record(z.string(), z.unknown()).nullable().optional(),
    contacts: z.record(z.string(), z.unknown()).nullable().optional(),
    teammates: z.record(z.string(), z.unknown()).nullable().optional(),
    conversation_parts: ConversationPartsSchema.nullable().optional(),
    tags: z.record(z.string(), z.unknown()).nullable().optional(),
    custom_attributes: z.record(z.string(), z.unknown()).nullable().optional(),
    statistics: z.record(z.string(), z.unknown()).nullable().optional()
});

const PagesSchema = z.object({
    type: z.string(),
    next: z
        .object({
            starting_after: z.string()
        })
        .nullable()
        .optional()
});

const ProviderResponseSchema = z.object({
    type: z.string(),
    conversations: z.array(ConversationSchema),
    pages: PagesSchema
});

const OutputSchema = z.object({
    conversations: z.array(
        z.object({
            id: z.string(),
            created_at: z.number(),
            updated_at: z.number(),
            state: z.enum(['open', 'closed', 'snoozed']),
            title: z.string().optional(),
            source: z.record(z.string(), z.unknown()).optional(),
            contacts: z.record(z.string(), z.unknown()).optional(),
            teammates: z.record(z.string(), z.unknown()).optional(),
            conversation_parts: z.record(z.string(), z.unknown()).optional(),
            tags: z.record(z.string(), z.unknown()).optional(),
            custom_attributes: z.record(z.string(), z.unknown()).optional(),
            statistics: z.record(z.string(), z.unknown()).optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List conversations with cursor-based pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            params['starting_after'] = input.cursor;
        }

        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        if (input.state !== undefined) {
            params['state'] = input.state;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/listConversations
        const response = await nango.get({
            endpoint: '/conversations',
            params: params,
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            conversations: providerData.conversations.map((conversation) => ({
                id: conversation.id,
                created_at: conversation.created_at,
                updated_at: conversation.updated_at,
                state: conversation.state,
                ...(conversation.title != null && { title: conversation.title }),
                ...(conversation.source != null && { source: conversation.source }),
                ...(conversation.contacts != null && { contacts: conversation.contacts }),
                ...(conversation.teammates != null && { teammates: conversation.teammates }),
                ...(conversation.conversation_parts != null && { conversation_parts: conversation.conversation_parts }),
                ...(conversation.tags != null && { tags: conversation.tags }),
                ...(conversation.custom_attributes != null && { custom_attributes: conversation.custom_attributes }),
                ...(conversation.statistics != null && { statistics: conversation.statistics })
            })),
            ...(providerData.pages.next?.starting_after != null && {
                next_cursor: providerData.pages.next.starting_after
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
