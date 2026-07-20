import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conversationId: z.string().describe('Conversation ID. Example: "tDtDnQdgm2LXpyiqYvZ6"'),
    cursor: z.string().optional().describe('Pagination cursor (lastMessageId) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of messages to fetch. Default is 20.'),
    type: z.string().optional().describe('Comma-separated message types to filter by. Example: "TYPE_SMS,TYPE_CALL"')
});

const MessageMetaSchema = z
    .object({
        callDuration: z.string().optional(),
        callStatus: z.string().optional(),
        email: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ProviderMessageSchema = z
    .object({
        id: z.string(),
        type: z.number(),
        messageType: z.string(),
        locationId: z.string(),
        contactId: z.string(),
        conversationId: z.string(),
        dateAdded: z.string(),
        body: z.string().optional(),
        direction: z.string(),
        status: z.string().optional(),
        contentType: z.string().optional(),
        attachments: z.array(z.string()).optional(),
        meta: MessageMetaSchema.optional(),
        activity: z.record(z.string(), z.unknown()).optional(),
        source: z.string().optional(),
        userId: z.string().optional(),
        conversationProviderId: z.string().optional(),
        chatWidgetId: z.string().optional(),
        dateUpdated: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    messages: z.object({
        lastMessageId: z.string().optional(),
        nextPage: z.boolean(),
        messages: z.array(ProviderMessageSchema)
    })
});

const MessageSchema = z.object({
    id: z.string(),
    type: z.number(),
    messageType: z.string(),
    locationId: z.string(),
    contactId: z.string(),
    conversationId: z.string(),
    dateAdded: z.string(),
    body: z.string().optional(),
    direction: z.string(),
    status: z.string().optional(),
    contentType: z.string().optional(),
    attachments: z.array(z.string()).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    activity: z.record(z.string(), z.unknown()).optional(),
    source: z.string().optional(),
    userId: z.string().optional(),
    conversationProviderId: z.string().optional(),
    chatWidgetId: z.string().optional(),
    dateUpdated: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional()
});

const OutputSchema = z.object({
    messages: z.array(MessageSchema),
    nextCursor: z.string().optional(),
    hasMore: z.boolean()
});

const action = createAction({
    description: 'List messages within a conversation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['conversations/message.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/6a3840f42035e-get-messages-by-conversation-id
            endpoint: `/conversations/${encodeURIComponent(input.conversationId)}/messages`,
            params: {
                ...(input.cursor !== undefined && { lastMessageId: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.type !== undefined && { type: input.type })
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const messageList = providerResponse.messages.messages;

        return {
            messages: messageList.map((message) => ({
                id: message.id,
                type: message.type,
                messageType: message.messageType,
                locationId: message.locationId,
                contactId: message.contactId,
                conversationId: message.conversationId,
                dateAdded: message.dateAdded,
                direction: message.direction,
                ...(message.body !== undefined && { body: message.body }),
                ...(message.status !== undefined && { status: message.status }),
                ...(message.contentType !== undefined && { contentType: message.contentType }),
                ...(message.attachments !== undefined && { attachments: message.attachments }),
                ...(message.meta !== undefined && { meta: message.meta }),
                ...(message.activity !== undefined && { activity: message.activity }),
                ...(message.source !== undefined && { source: message.source }),
                ...(message.userId !== undefined && { userId: message.userId }),
                ...(message.conversationProviderId !== undefined && { conversationProviderId: message.conversationProviderId }),
                ...(message.chatWidgetId !== undefined && { chatWidgetId: message.chatWidgetId }),
                ...(message.dateUpdated !== undefined && { dateUpdated: message.dateUpdated }),
                ...(message.from !== undefined && { from: message.from }),
                ...(message.to !== undefined && { to: message.to })
            })),
            ...(providerResponse.messages.lastMessageId !== undefined && { nextCursor: providerResponse.messages.lastMessageId }),
            hasMore: providerResponse.messages.nextPage
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
