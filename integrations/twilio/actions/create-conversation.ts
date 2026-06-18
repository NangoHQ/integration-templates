import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    FriendlyName: z.string().optional().describe('Human-readable name for the conversation. Example: "Support Chat"'),
    UniqueName: z.string().optional().describe('Unique name for the conversation. Example: "support-chat-123"'),
    DateCreated: z.string().optional().describe('ISO 8601 datetime for when the conversation was created. Example: "2024-01-01T00:00:00Z"'),
    DateUpdated: z.string().optional().describe('ISO 8601 datetime for when the conversation was last updated. Example: "2024-01-01T00:00:00Z"'),
    MessagingServiceSid: z
        .string()
        .optional()
        .describe('Messaging Service SID to associate with the conversation. Example: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'),
    Attributes: z.string().optional().describe('JSON string of custom attributes. Example: "{\\"key\\":\\"value\\"}"'),
    State: z.enum(['active', 'closed', 'inactive']).optional().describe('Conversation state.'),
    'Timers.Inactive': z.string().optional().describe('ISO 8601 duration for inactive timer. Example: "P1D"'),
    'Timers.Closed': z.string().optional().describe('ISO 8601 duration for closed timer. Example: "P1D"')
});

const ProviderConversationSchema = z.object({
    sid: z.string(),
    account_sid: z.string().nullable().optional(),
    chat_service_sid: z.string().nullable().optional(),
    messaging_service_sid: z.string().nullable().optional(),
    friendly_name: z.string().nullable().optional(),
    unique_name: z.string().nullable().optional(),
    attributes: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional(),
    timers: z
        .object({
            inactive: z.string().nullable().optional(),
            closed: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    url: z.string().nullable().optional(),
    links: z.record(z.string(), z.string()).nullable().optional()
});

const OutputSchema = z.object({
    sid: z.string(),
    account_sid: z.string().optional(),
    chat_service_sid: z.string().optional(),
    messaging_service_sid: z.string().optional(),
    friendly_name: z.string().optional(),
    unique_name: z.string().optional(),
    attributes: z.string().optional(),
    state: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    timers: z
        .object({
            inactive: z.string().optional(),
            closed: z.string().optional()
        })
        .optional(),
    url: z.string().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const action = createAction({
    description: 'Create a conversation in Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, string> = {};

        if (input['FriendlyName'] !== undefined) {
            data['FriendlyName'] = input['FriendlyName'];
        }
        if (input['UniqueName'] !== undefined) {
            data['UniqueName'] = input['UniqueName'];
        }
        if (input['DateCreated'] !== undefined) {
            data['DateCreated'] = input['DateCreated'];
        }
        if (input['DateUpdated'] !== undefined) {
            data['DateUpdated'] = input['DateUpdated'];
        }
        if (input['MessagingServiceSid'] !== undefined) {
            data['MessagingServiceSid'] = input['MessagingServiceSid'];
        }
        if (input['Attributes'] !== undefined) {
            data['Attributes'] = input['Attributes'];
        }
        if (input['State'] !== undefined) {
            data['State'] = input['State'];
        }
        if (input['Timers.Inactive'] !== undefined) {
            data['Timers.Inactive'] = input['Timers.Inactive'];
        }
        if (input['Timers.Closed'] !== undefined) {
            data['Timers.Closed'] = input['Timers.Closed'];
        }

        const formData = new URLSearchParams(data).toString();

        const response = await nango.post({
            // https://www.twilio.com/docs/conversations/api/conversation-resource#create-a-conversation-resource
            endpoint: '/v1/Conversations',
            baseUrlOverride: 'https://conversations.twilio.com',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: formData,
            retries: 1
        });

        const providerConversation = ProviderConversationSchema.parse(response.data);

        return {
            sid: providerConversation.sid,
            ...(providerConversation.account_sid != null && { account_sid: providerConversation.account_sid }),
            ...(providerConversation.chat_service_sid != null && { chat_service_sid: providerConversation.chat_service_sid }),
            ...(providerConversation.messaging_service_sid != null && { messaging_service_sid: providerConversation.messaging_service_sid }),
            ...(providerConversation.friendly_name != null && { friendly_name: providerConversation.friendly_name }),
            ...(providerConversation.unique_name != null && { unique_name: providerConversation.unique_name }),
            ...(providerConversation.attributes != null && { attributes: providerConversation.attributes }),
            ...(providerConversation.state != null && { state: providerConversation.state }),
            ...(providerConversation.date_created != null && { date_created: providerConversation.date_created }),
            ...(providerConversation.date_updated != null && { date_updated: providerConversation.date_updated }),
            ...(providerConversation.timers != null && {
                timers: {
                    ...(providerConversation.timers.inactive != null && { inactive: providerConversation.timers.inactive }),
                    ...(providerConversation.timers.closed != null && { closed: providerConversation.timers.closed })
                }
            }),
            ...(providerConversation.url != null && { url: providerConversation.url }),
            ...(providerConversation.links != null && { links: providerConversation.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
