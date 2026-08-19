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

const PaginationResponseSchema = z.object({
    meta: z.object({
        next_page_url: z.string().nullable().optional()
    })
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const sync = createSync({
    description: 'Sync conversations from Twilio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
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
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        let pageToken = checkpoint?.data.page_token;

        // Full refresh because the Twilio Conversations API does not support
        // an updated_since or modified_since filter; it only supports
        // startDate/endDate by creation date and pageToken pagination.
        await nango.trackDeletesStart('Conversation');

        // https://www.twilio.com/docs/conversations/api/conversation-resource#read-multiple-conversation-resources
        const params: Record<string, string | number> = {
            PageSize: 100
        };
        if (pageToken) {
            params['PageToken'] = pageToken;
        }

        const proxyConfig: ProxyConfiguration = {
            baseUrlOverride: 'https://conversations.twilio.com',
            // https://www.twilio.com/docs/conversations/api/conversation-resource#read-multiple-conversation-resources
            endpoint: '/v1/Conversations',
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'meta.next_page_url',
                response_path: 'conversations',
                limit_name_in_request: 'PageSize',
                limit: 100,
                on_page: async ({ response }) => {
                    const parsed = PaginationResponseSchema.safeParse(response.data);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse pagination metadata: ${parsed.error.message}`);
                    }
                    pageToken = parsed.data.meta.next_page_url
                        ? (new URL(parsed.data.meta.next_page_url).searchParams.get('PageToken') ?? undefined)
                        : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<z.infer<typeof ProviderConversationSchema>>(proxyConfig)) {
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

            if (pageToken) {
                await nango.saveCheckpoint({ page_token: pageToken });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Conversation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
