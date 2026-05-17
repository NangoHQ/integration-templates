import { createSync } from 'nango';
import { z } from 'zod';

const ChatMemberSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    userId: z.string().optional(),
    email: z.string().optional(),
    roles: z.array(z.string()).optional()
});

const ChatSchema = z.object({
    id: z.string(),
    topic: z.string().optional(),
    createdDateTime: z.string(),
    lastUpdatedDateTime: z.string(),
    chatType: z.string(),
    webUrl: z.string().optional(),
    tenantId: z.string().optional(),
    isHiddenForAllMembers: z.boolean().optional(),
    isHidden: z.boolean().optional(),
    members: z.array(ChatMemberSchema).optional()
});

const ProviderChatMemberSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    roles: z.array(z.string()).optional()
});

const ProviderChatSchema = z.object({
    id: z.string(),
    topic: z.string().nullable().optional(),
    createdDateTime: z.string(),
    lastUpdatedDateTime: z.string(),
    chatType: z.string(),
    webUrl: z.string().nullable().optional(),
    tenantId: z.string().nullable().optional(),
    isHiddenForAllMembers: z.boolean().optional(),
    viewpoint: z
        .object({
            isHidden: z.boolean().optional(),
            lastMessageReadDateTime: z.string().optional()
        })
        .optional(),
    members: z.array(ProviderChatMemberSchema).optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderChatSchema),
    '@odata.nextLink': z.string().optional()
});

const CheckpointSchema = z.object({
    nextLink: z.string()
});

const sync = createSync({
    description: 'Sync chats available to the user.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Chat: ChatSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/chats'
        }
    ],

    exec: async (nango) => {
        // Blocker: the /me/chats endpoint does not expose a reliable
        // changed-since filter for delegated permissions. It returns
        // the full chat inventory, so we use full refresh with deletion
        // detection.

        // Reset pagination so a resumed run always scans from page 1 — skipping
        // earlier pages would cause trackDeletesEnd to falsely delete those records.
        await nango.saveCheckpoint({ nextLink: '' });
        await nango.trackDeletesStart('Chat');

        let endpoint: string | undefined = '/v1.0/me/chats?$top=50&$expand=members';

        while (endpoint) {
            const currentEndpoint = endpoint;
            // https://learn.microsoft.com/graph/api/chat-list
            const response = await nango.get({
                endpoint: currentEndpoint,
                retries: 3
            });

            const parsed = ProviderResponseSchema.parse(response.data);
            const chats = parsed.value.map((chat) => ({
                id: chat.id,
                ...(chat.topic != null && { topic: chat.topic }),
                createdDateTime: chat.createdDateTime,
                lastUpdatedDateTime: chat.lastUpdatedDateTime,
                chatType: chat.chatType,
                ...(chat.webUrl != null && { webUrl: chat.webUrl }),
                ...(chat.tenantId != null && { tenantId: chat.tenantId }),
                ...(chat.isHiddenForAllMembers !== undefined && { isHiddenForAllMembers: chat.isHiddenForAllMembers }),
                ...(chat.viewpoint?.isHidden !== undefined && { isHidden: chat.viewpoint.isHidden }),
                ...(chat.members !== undefined && {
                    members: chat.members.map((member) => ({
                        id: member.id,
                        ...(member.displayName != null && { displayName: member.displayName }),
                        ...(member.userId != null && { userId: member.userId }),
                        ...(member.email != null && { email: member.email }),
                        ...(member.roles !== undefined && { roles: member.roles })
                    }))
                })
            }));

            if (chats.length > 0) {
                await nango.batchSave(chats, 'Chat');
            }

            endpoint = parsed['@odata.nextLink'];
        }
        await nango.trackDeletesEnd('Chat');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
