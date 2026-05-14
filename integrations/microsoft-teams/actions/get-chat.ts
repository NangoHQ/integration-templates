import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the chat. Example: "19:xxx@thread.v2"')
});

const ProviderChatSchema = z.object({
    id: z.string(),
    topic: z.string().nullable().optional(),
    chatType: z.enum(['oneOnOne', 'group', 'meeting', 'unknownFutureValue']).optional(),
    createdDateTime: z.string().optional(),
    lastUpdatedDateTime: z.string().optional(),
    onlineMeetingInfo: z
        .object({
            joinWebUrl: z.string().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    tenantId: z.string().optional(),
    webUrl: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    topic: z.string().optional(),
    chat_type: z.enum(['oneOnOne', 'group', 'meeting', 'unknownFutureValue']).optional(),
    created_at: z.string().optional(),
    last_updated_at: z.string().optional(),
    join_url: z.string().optional(),
    tenant_id: z.string().optional(),
    web_url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a chat by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-chat'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Chat.Read', 'Chat.ReadBasic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/chat-get
            endpoint: `/v1.0/chats/${input.id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Chat not found',
                id: input.id
            });
        }

        const providerChat = ProviderChatSchema.parse(response.data);

        return {
            id: providerChat.id,
            ...(providerChat.topic != null && { topic: providerChat.topic }),
            ...(providerChat.chatType !== undefined && { chat_type: providerChat.chatType }),
            ...(providerChat.createdDateTime !== undefined && { created_at: providerChat.createdDateTime }),
            ...(providerChat.lastUpdatedDateTime !== undefined && { last_updated_at: providerChat.lastUpdatedDateTime }),
            ...(providerChat.onlineMeetingInfo?.joinWebUrl !== undefined && { join_url: providerChat.onlineMeetingInfo.joinWebUrl }),
            ...(providerChat.tenantId !== undefined && { tenant_id: providerChat.tenantId }),
            ...(providerChat.webUrl != null && { web_url: providerChat.webUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
