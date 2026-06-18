import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier for the conversation. Example: "123"'),
    display_as: z
        .enum(['plaintext', 'html'])
        .optional()
        .describe('Format for conversation parts content. Use "plaintext" for plain text or "html" for HTML formatted content.')
});

const ConversationPartAuthorSchema = z
    .object({
        type: z.string().optional(),
        id: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const ConversationPartSchema = z
    .object({
        type: z.string().optional(),
        id: z.string(),
        part_type: z.string().optional(),
        body: z.string().nullable().optional(),
        created_at: z.number(),
        updated_at: z.number().optional(),
        notified_at: z.number().optional(),
        assigned_to: z.unknown().nullable().optional(),
        author: ConversationPartAuthorSchema.optional(),
        attachments: z.array(z.unknown()).optional()
    })
    .passthrough();

const ConversationPartsSchema = z
    .object({
        type: z.string().optional(),
        conversation_parts: z.array(ConversationPartSchema),
        total_count: z.number()
    })
    .passthrough();

const SourceSchema = z
    .object({
        type: z.string().optional(),
        id: z.string().optional(),
        delivered_as: z.string().optional(),
        subject: z.string().nullable().optional(),
        body: z.string().nullable().optional(),
        author: ConversationPartAuthorSchema.optional(),
        attachments: z.array(z.unknown()).optional(),
        url: z.string().nullable().optional(),
        redacted: z.boolean().optional()
    })
    .passthrough();

const AssigneeSchema = z
    .object({
        type: z.string(),
        id: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const ContactSchema = z
    .object({
        type: z.string(),
        id: z.string()
    })
    .passthrough();

const ContactsListSchema = z
    .object({
        type: z.string().optional(),
        contacts: z.array(ContactSchema)
    })
    .passthrough();

const TagsListSchema = z
    .object({
        type: z.string().optional(),
        tags: z.array(z.unknown()),
        total_count: z.number().optional()
    })
    .passthrough();

const ConversationSchema = z
    .object({
        type: z.string().optional(),
        id: z.string(),
        title: z.string().nullable().optional(),
        created_at: z.number(),
        updated_at: z.number(),
        waiting_since: z.number().nullable().optional(),
        snoozed_until: z.number().nullable().optional(),
        open: z.boolean().optional(),
        state: z.enum(['open', 'closed', 'snoozed']).optional(),
        read: z.boolean().optional(),
        priority: z.enum(['priority', 'not_priority']).optional(),
        admin_assignee_id: z.number().nullable().optional(),
        team_assignee_id: z.number().nullable().optional(),
        assignee: AssigneeSchema.nullable().optional(),
        user: ContactSchema.optional(),
        contacts: ContactsListSchema.optional(),
        source: SourceSchema.nullable().optional(),
        conversation_parts: ConversationPartsSchema.optional(),
        tags: TagsListSchema.optional()
    })
    .passthrough();

const OutputSchema = ConversationSchema;

const action = createAction({
    description: 'Retrieve a conversation by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_conversations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['display_as']) {
            params['display_as'] = input['display_as'];
        }

        const response = await nango.get({
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/getConversation
            endpoint: `/conversations/${encodeURIComponent(input.id)}`,
            params: params,
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Conversation not found',
                id: input.id
            });
        }

        const conversation = ConversationSchema.parse(response.data);

        return conversation;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
