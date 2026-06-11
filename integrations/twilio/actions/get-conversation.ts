import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationSid: z.string().describe('The SID of the Conversation to retrieve. Example: CHaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
});

const TimersSchema = z.object({
    date_inactive: z.string().optional(),
    date_closed: z.string().optional()
});

const LinksSchema = z.object({
    participants: z.string().optional(),
    messages: z.string().optional(),
    webhooks: z.string().optional(),
    export: z.string().optional()
});

const ProviderConversationSchema = z
    .object({
        sid: z.string(),
        account_sid: z.string().optional(),
        chat_service_sid: z.string().optional(),
        messaging_service_sid: z.string().optional(),
        friendly_name: z.string().nullable().optional(),
        unique_name: z.string().nullable().optional(),
        attributes: z.string().nullable().optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        state: z.string().optional(),
        timers: TimersSchema.optional(),
        bindings: z.record(z.string(), z.unknown()).nullable().optional(),
        url: z.string().optional(),
        links: LinksSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    sid: z.string(),
    account_sid: z.string().optional(),
    chat_service_sid: z.string().optional(),
    messaging_service_sid: z.string().optional(),
    friendly_name: z.string().optional(),
    unique_name: z.string().optional(),
    attributes: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    state: z.string().optional(),
    timers: TimersSchema.optional(),
    bindings: z.record(z.string(), z.unknown()).nullable().optional(),
    url: z.string().optional(),
    links: LinksSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single conversation from Twilio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-conversation',
        group: 'Conversations'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/conversations/api/conversation-resource
        const response = await nango.get({
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversationSid)}`,
            baseUrlOverride: 'https://conversations.twilio.com',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Conversation not found',
                conversation_sid: input.conversationSid
            });
        }

        const providerConversation = ProviderConversationSchema.parse(response.data);

        return {
            sid: providerConversation.sid,
            ...(providerConversation.account_sid !== undefined && { account_sid: providerConversation.account_sid }),
            ...(providerConversation.chat_service_sid !== undefined && { chat_service_sid: providerConversation.chat_service_sid }),
            ...(providerConversation.messaging_service_sid !== undefined && { messaging_service_sid: providerConversation.messaging_service_sid }),
            ...(providerConversation.friendly_name != null && { friendly_name: providerConversation.friendly_name }),
            ...(providerConversation.unique_name != null && { unique_name: providerConversation.unique_name }),
            ...(providerConversation.attributes != null && { attributes: providerConversation.attributes }),
            ...(providerConversation.date_created !== undefined && { date_created: providerConversation.date_created }),
            ...(providerConversation.date_updated !== undefined && { date_updated: providerConversation.date_updated }),
            ...(providerConversation.state !== undefined && { state: providerConversation.state }),
            ...(providerConversation.timers !== undefined && { timers: providerConversation.timers }),
            ...(providerConversation.bindings != null && { bindings: providerConversation.bindings }),
            ...(providerConversation.url !== undefined && { url: providerConversation.url }),
            ...(providerConversation.links !== undefined && { links: providerConversation.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
