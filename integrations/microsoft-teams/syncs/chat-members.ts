import { createSync } from 'nango';
import { z } from 'zod';

const ChatSchema = z.object({
    id: z.string()
});

const ChatMemberSchema = z.object({
    id: z.string(),
    userId: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    roles: z.array(z.string()).optional().nullable()
});

const ChatMemberRecordSchema = z.object({
    id: z.string(),
    chatId: z.string(),
    userId: z.string().optional(),
    displayName: z.string().optional(),
    roles: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    chatsPageEndpoint: z.string(),
    chatIndex: z.number().int().min(-1),
    membersNextLink: z.string()
});

const ChatListResponseSchema = z.object({
    value: z.array(ChatSchema),
    '@odata.nextLink': z.string().optional()
});

const ChatMemberListResponseSchema = z.object({
    value: z.array(ChatMemberSchema),
    '@odata.nextLink': z.string().optional()
});

function buildGraphRequest(endpointOrUrl: string, defaultParams?: Record<string, string>) {
    if (!endpointOrUrl.includes('?')) {
        return {
            endpoint: endpointOrUrl,
            ...(defaultParams ? { params: defaultParams } : {})
        };
    }

    const url = new URL(endpointOrUrl.startsWith('http') ? endpointOrUrl : `https://graph.microsoft.com${endpointOrUrl}`);
    const params = Object.fromEntries(url.searchParams.entries());

    return {
        endpoint: endpointOrUrl.startsWith('http') ? `${url.origin}${url.pathname}` : url.pathname,
        ...(Object.keys(params).length > 0 ? { params } : {})
    };
}

const sync = createSync({
    description: 'Sync member rosters for chats',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ChatMember: ChatMemberRecordSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/chat-members'
        }
    ],

    exec: async (nango) => {
        // Blocker: Microsoft Graph /chats/{id}/members does not support delta,
        // change notifications, modified_since, or a deleted-record endpoint.
        // Membership rosters must be fully enumerated as snapshots.

        const checkpointResult = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpointResult);
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : { chatsPageEndpoint: '', chatIndex: -1, membersNextLink: '' };

        await nango.trackDeletesStart('ChatMember');

        const batch: z.infer<typeof ChatMemberRecordSchema>[] = [];
        const batchSize = 100;

        const flushBatch = async () => {
            if (batch.length > 0) {
                await nango.batchSave([...batch], 'ChatMember');
                batch.length = 0;
            }
        };

        let currentChatsPageEndpoint = checkpoint.chatsPageEndpoint || '/v1.0/me/chats';
        let resumeChatIndex = checkpoint.chatIndex >= 0 ? checkpoint.chatIndex : 0;
        let resumeMembersNextLink = checkpoint.membersNextLink || '';

        while (currentChatsPageEndpoint) {
            // https://learn.microsoft.com/graph/api/chat-list
            const chatsRequest = buildGraphRequest(currentChatsPageEndpoint, currentChatsPageEndpoint === '/v1.0/me/chats' ? { $top: '50' } : undefined);
            const chatResponse = await nango.get({
                ...chatsRequest,
                retries: 3
            });

            const chatData = ChatListResponseSchema.parse(chatResponse.data);
            const chats = chatData.value;

            const startChatIndex = resumeChatIndex >= 0 && resumeChatIndex < chats.length ? resumeChatIndex : 0;

            for (let chatIndex = startChatIndex; chatIndex < chats.length; chatIndex += 1) {
                const chat = chats[chatIndex]!;
                let membersNextLink: string | undefined = chatIndex === startChatIndex && resumeMembersNextLink ? resumeMembersNextLink : undefined;

                do {
                    // https://learn.microsoft.com/graph/api/chat-list-members
                    const membersRequest = buildGraphRequest(membersNextLink || `/v1.0/chats/${chat.id}/members`);
                    const memberResponse = await nango.get({
                        ...membersRequest,
                        retries: 3
                    });

                    const memberData = ChatMemberListResponseSchema.parse(memberResponse.data);
                    const members = memberData.value;

                    for (const member of members) {
                        const record = {
                            id: `${chat.id}_${member.id}`,
                            chatId: chat.id,
                            ...(member.userId != null && { userId: member.userId }),
                            ...(member.displayName != null && { displayName: member.displayName }),
                            ...(member.roles != null && { roles: member.roles })
                        };
                        batch.push(record);

                        if (batch.length >= batchSize) {
                            await flushBatch();
                        }
                    }

                    membersNextLink = memberData['@odata.nextLink'];
                    await flushBatch();

                    if (membersNextLink) {
                        await nango.saveCheckpoint({
                            chatsPageEndpoint: currentChatsPageEndpoint,
                            chatIndex,
                            membersNextLink
                        });
                    }
                } while (membersNextLink);

                await nango.saveCheckpoint({
                    chatsPageEndpoint: currentChatsPageEndpoint,
                    chatIndex: chatIndex + 1,
                    membersNextLink: ''
                });

                // Clear resume state after the first chat in a resumed page
                resumeMembersNextLink = '';
            }

            const nextChatsPage = chatData['@odata.nextLink'];
            if (nextChatsPage) {
                await nango.saveCheckpoint({
                    chatsPageEndpoint: nextChatsPage,
                    chatIndex: 0,
                    membersNextLink: ''
                });
                currentChatsPageEndpoint = nextChatsPage;
                resumeChatIndex = 0;
                resumeMembersNextLink = '';
            } else {
                currentChatsPageEndpoint = '';
            }
        }

        await flushBatch();
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ChatMember');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
