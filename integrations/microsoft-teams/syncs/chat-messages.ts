import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ChatMessageSchema = z.object({
    id: z.string(),
    chatId: z.string().optional(),
    messageId: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    lastEditedDateTime: z.string().optional(),
    fromDisplayName: z.string().optional(),
    bodyContent: z.string().optional(),
    bodyContentType: z.string().optional(),
    messageType: z.string().optional(),
    importance: z.string().optional(),
    subject: z.string().optional(),
    deletedDateTime: z.string().optional(),
    replyToId: z.string().optional(),
    webUrl: z.string().optional()
});

const CheckpointSchema = z.object({
    delta_link: z.string()
});

const ItemBodySchema = z.object({
    content: z.string().nullish(),
    contentType: z.string().nullish()
});

const ChatMessageFromIdentitySetSchema = z.object({
    user: z
        .object({
            displayName: z.string().nullish()
        })
        .nullish(),
    application: z
        .object({
            displayName: z.string().nullish()
        })
        .nullish()
});

const ProviderChatMessageSchema = z.object({
    id: z.string(),
    chatId: z.string().nullish(),
    createdDateTime: z.string().nullish(),
    lastModifiedDateTime: z.string().nullish(),
    lastEditedDateTime: z.string().nullish(),
    deletedDateTime: z.string().nullish(),
    from: ChatMessageFromIdentitySetSchema.nullish(),
    body: ItemBodySchema.nullish(),
    messageType: z.string().nullish(),
    importance: z.string().nullish(),
    subject: z.string().nullish(),
    replyToId: z.string().nullish(),
    webUrl: z.string().nullish()
});

const DeltaResponseSchema = z.object({
    value: z.array(ProviderChatMessageSchema),
    '@odata.nextLink': z.string().optional(),
    '@odata.deltaLink': z.string().optional()
});

const ChatSchema = z.object({
    id: z.string()
});

const ErrorResponseSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

function isPermissionError(err: unknown): boolean {
    const parsed = ErrorResponseSchema.safeParse(err);
    if (!parsed.success) {
        return false;
    }
    const status = parsed.data.response.status;
    return status === 403 || status === 412;
}

function mapMessages(rawMessages: unknown[], fallbackChatId?: string): z.infer<typeof ChatMessageSchema>[] {
    const messages: z.infer<typeof ChatMessageSchema>[] = [];
    for (const raw of rawMessages) {
        const parsed = ProviderChatMessageSchema.safeParse(raw);
        if (!parsed.success) {
            continue;
        }

        const msg = parsed.data;
        const fromDisplayName = msg.from?.user?.displayName ?? msg.from?.application?.displayName ?? undefined;
        messages.push({
            id: `${msg.chatId ?? fallbackChatId ?? 'unknown'}_${msg.id}`,
            chatId: msg.chatId ?? fallbackChatId,
            messageId: msg.id,
            createdDateTime: msg.createdDateTime ?? undefined,
            lastModifiedDateTime: msg.lastModifiedDateTime ?? undefined,
            lastEditedDateTime: msg.lastEditedDateTime ?? undefined,
            fromDisplayName,
            bodyContent: msg.body?.content ?? undefined,
            bodyContentType: msg.body?.contentType ?? undefined,
            messageType: msg.messageType ?? undefined,
            importance: msg.importance ?? undefined,
            subject: msg.subject ?? undefined,
            deletedDateTime: msg.deletedDateTime ?? undefined,
            replyToId: msg.replyToId ?? undefined,
            webUrl: msg.webUrl ?? undefined
        });
    }
    return messages;
}

const sync = createSync({
    description: 'Sync chat messages across user chats.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ChatMessage: ChatMessageSchema
    },
    endpoints: [
        {
            path: '/syncs/chat-messages',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        let endpoint = '/v1.0/me/chats/getAllMessages/delta';
        let baseUrlOverride: string | undefined;
        let requestParams: Record<string, string | number> | undefined = { $top: 50 };

        if (checkpoint?.delta_link) {
            const url = new URL(checkpoint.delta_link);
            baseUrlOverride = url.origin;
            endpoint = url.pathname + url.search;
            requestParams = undefined;
        }

        // @allowTryCatch Fallback to chat-scoped list endpoints when application permissions are unavailable.
        try {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
            while (true) {
                // https://learn.microsoft.com/graph/api/chatmessage-delta
                const response = await nango.get({
                    endpoint,
                    ...(baseUrlOverride && { baseUrlOverride }),
                    ...(requestParams && { params: requestParams }),
                    retries: 3
                });

                if (response.status !== 200) {
                    throw { response: { status: response.status } };
                }

                const parsed = DeltaResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    await nango.log('Failed to parse delta response', { level: 'warn' });
                    break;
                }

                const data = parsed.data;
                const rawMessages = data.value;

                if (Array.isArray(rawMessages) && rawMessages.length > 0) {
                    const messages = mapMessages(rawMessages);
                    if (messages.length > 0) {
                        await nango.batchSave(messages, 'ChatMessage');
                    }
                }

                const nextLink = data['@odata.nextLink'];
                const deltaLink = data['@odata.deltaLink'];

                if (deltaLink) {
                    await nango.saveCheckpoint({ delta_link: deltaLink });
                    break;
                }

                if (nextLink) {
                    await nango.saveCheckpoint({ delta_link: nextLink });
                    const nextUrl = new URL(nextLink);
                    baseUrlOverride = nextUrl.origin;
                    endpoint = nextUrl.pathname + nextUrl.search;
                    requestParams = undefined;
                    continue;
                }

                break;
            }
        } catch (error) {
            if (isPermissionError(error)) {
                await nango.log('Application-permission delta endpoint returned 403; falling back to chat-scoped list endpoints.', { level: 'warn' });
                await runFallback(nango);
            } else {
                throw error;
            }
        }
    }
});

async function runFallback(nango: NangoSyncLocal) {
    await nango.trackDeletesStart('ChatMessage');

    const chatProxyConfig: ProxyConfiguration = {
        // https://learn.microsoft.com/graph/api/chat-list
        endpoint: '/v1.0/me/chats',
        paginate: {
            type: 'link',
            link_path_in_response_body: '@odata.nextLink',
            response_path: 'value',
            limit_name_in_request: '$top',
            limit: 50
        },
        retries: 3
    };

    for await (const rawChats of nango.paginate<unknown>(chatProxyConfig)) {
        if (!Array.isArray(rawChats)) {
            continue;
        }

        for (const rawChat of rawChats) {
            const parsedChat = ChatSchema.safeParse(rawChat);
            if (!parsedChat.success) {
                await nango.log('Failed to parse chat', { level: 'warn' });
                continue;
            }

            const chatId = parsedChat.data.id;

            const messageProxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/graph/api/chat-list-messages
                endpoint: `/v1.0/chats/${chatId}/messages`,
                paginate: {
                    type: 'link',
                    link_path_in_response_body: '@odata.nextLink',
                    response_path: 'value',
                    limit_name_in_request: '$top',
                    limit: 50
                },
                retries: 3
            };

            for await (const rawMessages of nango.paginate<unknown>(messageProxyConfig)) {
                if (!Array.isArray(rawMessages)) {
                    continue;
                }

                const messages = mapMessages(rawMessages, chatId);
                if (messages.length > 0) {
                    await nango.batchSave(messages, 'ChatMessage');
                }
            }
        }
    }

    await nango.trackDeletesEnd('ChatMessage');
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
