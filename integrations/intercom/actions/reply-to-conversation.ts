import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversation_id: z.string().describe('The Intercom conversation ID to reply to. Example: "123"'),
    type: z.enum(['admin', 'user']).describe('The type of reply: "admin" for admin replies, "user" for contact replies.'),
    message_type: z.enum(['comment', 'note']).describe('The message type: "comment" for replies, "note" for internal admin notes.'),
    body: z.string().describe('The text body of the reply. Notes accept HTML formatting.'),
    admin_id: z.string().optional().describe('The admin ID (required for type="admin").'),
    intercom_user_id: z.string().optional().describe('The contact ID (required for type="user").'),
    attachment_urls: z.array(z.string()).optional().describe('Optional array of attachment URLs (max 5).')
});

const ProviderConversationPartSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    body: z.string().nullable().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    author: z
        .object({
            id: z.string().optional(),
            type: z.string().optional(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
});

const ProviderConversationPartsSchema = z.object({
    conversation_parts: z.array(ProviderConversationPartSchema).optional()
});

const ProviderConversationSchema = z.object({
    id: z.string(),
    state: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    conversation_parts: ProviderConversationPartsSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    state: z.string().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    conversation_parts: z
        .array(
            z.object({
                id: z.string(),
                type: z.string().optional(),
                body: z.union([z.string(), z.null()]).optional(),
                created_at: z.number().optional(),
                updated_at: z.number().optional(),
                author_id: z.string().optional(),
                author_type: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Add a reply or internal note to a conversation',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversation:reply'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            type: input.type,
            message_type: input.message_type,
            body: input.body
        };

        if (input.type === 'admin') {
            if (!input.admin_id) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'admin_id is required when type is "admin"'
                });
            }
            requestBody['admin_id'] = input.admin_id;
        } else if (input.type === 'user') {
            if (!input.intercom_user_id) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'intercom_user_id is required when type is "user"'
                });
            }
            if (input.message_type !== 'comment') {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'message_type must be "comment" for user replies; only admins can send notes'
                });
            }
            requestBody['intercom_user_id'] = input.intercom_user_id;
        }

        if (input.attachment_urls !== undefined && input.attachment_urls.length > 0) {
            if (input.attachment_urls.length > 5) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: 'Maximum 5 attachment URLs allowed'
                });
            }
            requestBody['attachment_urls'] = input.attachment_urls;
        }

        const response = await nango.post({
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/replyToConversation
            endpoint: `/conversations/${encodeURIComponent(input.conversation_id)}/reply`,
            data: requestBody,
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from Intercom API'
            });
        }

        const conversation = ProviderConversationSchema.parse(response.data);
        const parts = conversation.conversation_parts?.conversation_parts ?? [];

        return {
            id: conversation.id,
            ...(conversation.state !== undefined && { state: conversation.state }),
            ...(conversation.created_at !== undefined && { created_at: conversation.created_at }),
            ...(conversation.updated_at !== undefined && { updated_at: conversation.updated_at }),
            ...(parts.length > 0 && {
                conversation_parts: parts.map((part) => ({
                    id: part.id,
                    ...(part.type !== undefined && { type: part.type }),
                    ...(part.body !== undefined && { body: part.body }),
                    ...(part.created_at !== undefined && { created_at: part.created_at }),
                    ...(part.updated_at !== undefined && { updated_at: part.updated_at }),
                    ...(part.author?.id !== undefined && { author_id: part.author.id }),
                    ...(part.author?.type !== undefined && { author_type: part.author.type })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
