import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationSid: z.string().describe('The SID of the conversation to update. Example: "CHXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"'),
    friendlyName: z.string().optional().describe('The human-readable name of this conversation. Example: "My Conversation"'),
    state: z.enum(['active', 'inactive', 'closed']).optional().describe('The state of the conversation. Example: "active"'),
    attributes: z.string().optional().describe('A JSON string containing metadata. Example: \'{"topic":"feedback"}\''),
    timersInactive: z.string().optional().describe('ISO8601 duration for inactive timer. Example: "PT1M"'),
    timersClosed: z.string().optional().describe('ISO8601 duration for closed timer. Example: "PT10M"')
});

const ProviderConversationSchema = z.object({
    sid: z.string(),
    account_sid: z.string().optional(),
    chat_service_sid: z.string().optional(),
    messaging_service_sid: z.string().optional(),
    friendly_name: z.string().nullable().optional(),
    unique_name: z.string().nullable().optional(),
    attributes: z.string().optional(),
    state: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    timers: z
        .object({
            date_inactive: z.string().optional(),
            date_closed: z.string().optional()
        })
        .optional(),
    bindings: z.record(z.string(), z.unknown()).nullable().optional(),
    url: z.string().optional(),
    links: z.record(z.string(), z.string()).optional()
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
            date_inactive: z.string().optional(),
            date_closed: z.string().optional()
        })
        .optional(),
    bindings: z.record(z.string(), z.unknown()).optional(),
    url: z.string().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const action = createAction({
    description: 'Update a conversation in Twilio',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = new URLSearchParams();
        if (input.friendlyName !== undefined) {
            params.append('FriendlyName', input.friendlyName);
        }
        if (input.state !== undefined) {
            params.append('State', input.state);
        }
        if (input.attributes !== undefined) {
            params.append('Attributes', input.attributes);
        }
        if (input.timersInactive !== undefined) {
            params.append('Timers.Inactive', input.timersInactive);
        }
        if (input.timersClosed !== undefined) {
            params.append('Timers.Closed', input.timersClosed);
        }

        // https://www.twilio.com/docs/conversations/api/conversation-resource#update-a-conversation-resource
        const response = await nango.post({
            endpoint: `/v1/Conversations/${encodeURIComponent(input.conversationSid)}`,
            baseUrlOverride: 'https://conversations.twilio.com',
            data: params.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            },
            retries: 3
        });

        const providerConversation = ProviderConversationSchema.parse(response.data);

        return {
            sid: providerConversation.sid,
            ...(providerConversation.account_sid !== undefined && { account_sid: providerConversation.account_sid }),
            ...(providerConversation.chat_service_sid !== undefined && { chat_service_sid: providerConversation.chat_service_sid }),
            ...(providerConversation.messaging_service_sid !== undefined && { messaging_service_sid: providerConversation.messaging_service_sid }),
            ...(providerConversation.friendly_name != null && { friendly_name: providerConversation.friendly_name }),
            ...(providerConversation.unique_name != null && { unique_name: providerConversation.unique_name }),
            ...(providerConversation.attributes !== undefined && { attributes: providerConversation.attributes }),
            ...(providerConversation.state !== undefined && { state: providerConversation.state }),
            ...(providerConversation.date_created !== undefined && { date_created: providerConversation.date_created }),
            ...(providerConversation.date_updated !== undefined && { date_updated: providerConversation.date_updated }),
            ...(providerConversation.timers !== undefined && {
                timers: {
                    ...(providerConversation.timers.date_inactive !== undefined && { date_inactive: providerConversation.timers.date_inactive }),
                    ...(providerConversation.timers.date_closed !== undefined && { date_closed: providerConversation.timers.date_closed })
                }
            }),
            ...(providerConversation.bindings != null && { bindings: providerConversation.bindings }),
            ...(providerConversation.url !== undefined && { url: providerConversation.url }),
            ...(providerConversation.links !== undefined && { links: providerConversation.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
