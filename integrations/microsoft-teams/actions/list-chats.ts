import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response (@odata.nextLink). Omit for the first page.'),
    userId: z.string().optional().describe('User ID to scope chats to a specific user. Omit to use /me/chats.')
});

const ViewpointSchema = z.object({
    isHidden: z.boolean().optional(),
    lastMessageReadDateTime: z.string().optional()
});

const ChatSchema = z.object({
    id: z.string(),
    topic: z.string().nullable().optional(),
    createdDateTime: z.string().optional(),
    lastUpdatedDateTime: z.string().optional(),
    chatType: z.string().optional(),
    webUrl: z.string().nullable().optional(),
    isHiddenForAllMembers: z.boolean().optional(),
    tenantId: z.string().nullable().optional(),
    viewpoint: ViewpointSchema.optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ChatSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ChatSchema),
    nextLink: z.string().optional()
});

const action = createAction({
    description: 'List chats for a user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-chats',
        group: 'Chats'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Chat.ReadBasic', 'Chat.Read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint: string;
        if (input.cursor) {
            endpoint = input.cursor;
        } else if (input.userId) {
            endpoint = `/v1.0/users/${encodeURIComponent(input.userId)}/chats`;
        } else {
            endpoint = '/v1.0/me/chats';
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/chat-list
            endpoint,
            ...(input.cursor ? {} : { params: { $top: '50' } }),
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.value,
            ...(providerResponse['@odata.nextLink'] != null && { nextLink: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
