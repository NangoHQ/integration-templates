import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderConversationSchema = z.object({
    sid: z.string(),
    account_sid: z.string().optional(),
    chat_service_sid: z.string().optional(),
    messaging_service_sid: z.string().optional(),
    friendly_name: z.string().nullable().optional(),
    unique_name: z.string().nullable().optional(),
    attributes: z.string().nullable().optional(),
    state: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const ConversationSchema = z.object({
    id: z.string(),
    account_sid: z.string().optional(),
    chat_service_sid: z.string().optional(),
    messaging_service_sid: z.string().optional(),
    friendly_name: z.string().optional(),
    unique_name: z.string().optional(),
    attributes: z.string().optional(),
    state: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const sync = createSync({
    description: 'Sync conversations from Twilio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Conversation: ConversationSchema
    },
    endpoints: [
        {
            path: '/syncs/conversations',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Full refresh because the Twilio Conversations API does not support
        // an updated_since or modified_since filter; it only supports
        // startDate/endDate by creation date and pageToken pagination.
        await nango.trackDeletesStart('Conversation');

        // https://www.twilio.com/docs/conversations/api/conversation-resource#read-multiple-conversation-resources
        const proxyConfig: ProxyConfiguration = {
            baseUrlOverride: 'https://conversations.twilio.com',
            // https://www.twilio.com/docs/conversations/api/conversation-resource#read-multiple-conversation-resources
            endpoint: '/v1/Conversations',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'meta.next_page_url',
                response_path: 'conversations',
                limit_name_in_request: 'PageSize',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = ProviderConversationSchema.array().safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse conversations: ${parsed.error.message}`);
            }

            const conversations = parsed.data.map((record) => ({
                id: record.sid,
                ...(record.account_sid !== undefined && { account_sid: record.account_sid }),
                ...(record.chat_service_sid !== undefined && { chat_service_sid: record.chat_service_sid }),
                ...(record.messaging_service_sid !== undefined && { messaging_service_sid: record.messaging_service_sid }),
                ...(record.friendly_name != null && { friendly_name: record.friendly_name }),
                ...(record.unique_name != null && { unique_name: record.unique_name }),
                ...(record.attributes != null && { attributes: record.attributes }),
                ...(record.state !== undefined && { state: record.state }),
                ...(record.date_created !== undefined && { date_created: record.date_created }),
                ...(record.date_updated !== undefined && { date_updated: record.date_updated }),
                ...(record.url !== undefined && { url: record.url }),
                ...(record.links !== undefined && { links: record.links })
            }));

            if (conversations.length > 0) {
                await nango.batchSave(conversations, 'Conversation');
            }
        }

        await nango.trackDeletesEnd('Conversation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
