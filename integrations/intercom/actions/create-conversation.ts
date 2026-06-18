import { z } from 'zod';
import { createAction } from 'nango';

const FromSchema = z.object({
    type: z.enum(['admin', 'contact', 'user']),
    id: z.string().describe('The ID of the admin, contact, or user')
});

const InputSchema = z.object({
    from: FromSchema.describe('The admin or contact starting the conversation'),
    body: z.string().describe('The message body'),
    subject: z.string().optional().describe('Subject line for email conversations (required when message type is email)')
});

// The create conversation endpoint returns a user_message object
const ProviderMessageSchema = z.object({
    type: z.string(),
    id: z.string(),
    created_at: z.number(),
    body: z.string(),
    message_type: z.enum(['email', 'inapp', 'facebook', 'twitter']),
    conversation_id: z.string(),
    subject: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The message ID'),
    conversation_id: z.string().describe('The conversation ID'),
    created_at: z.number(),
    body: z.string(),
    message_type: z.enum(['email', 'inapp', 'facebook', 'twitter']),
    subject: z.string().optional()
});

const action = createAction({
    description: 'Start a new conversation.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            from: input.from,
            body: input.body
        };

        if (input.subject !== undefined) {
            requestBody['subject'] = input.subject;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/createConversation
        const response = await nango.post({
            endpoint: '/conversations',
            headers: {
                'Intercom-Version': '2.11'
            },
            data: requestBody,
            retries: 3
        });

        const message = ProviderMessageSchema.parse(response.data);

        return {
            id: message.id,
            conversation_id: message.conversation_id,
            created_at: message.created_at,
            body: message.body,
            message_type: message.message_type,
            ...(message.subject != null && { subject: message.subject })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
