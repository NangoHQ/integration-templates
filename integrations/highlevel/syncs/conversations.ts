import { createSync } from 'nango';
import { z } from 'zod';

const ProviderConversationSchema = z.object({
    id: z.string(),
    locationId: z.string(),
    contactId: z.string(),
    lastMessageBody: z.string().optional(),
    lastMessageType: z.string(),
    type: z.string(),
    unreadCount: z.number(),
    fullName: z.string(),
    contactName: z.string(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    dateAdded: z.number(),
    dateUpdated: z.number(),
    lastMessageDate: z.number(),
    companyName: z.string().nullable().optional(),
    tags: z.array(z.string()),
    followers: z.array(z.unknown()),
    mentions: z.array(z.unknown()),
    isLastMessageInternalComment: z.boolean(),
    profilePhoto: z.string().nullable().optional(),
    attributed: z.boolean().nullable().optional(),
    scoring: z.array(z.unknown()),
    messageTypes: z.array(z.number()),
    sort: z.array(z.number())
});

const ProviderSearchResponseSchema = z.object({
    conversations: z.array(ProviderConversationSchema),
    total: z.number()
});

const ConversationSchema = z.object({
    id: z.string(),
    locationId: z.string().optional(),
    contactId: z.string().optional(),
    lastMessageBody: z.string().optional(),
    lastMessageType: z.string().optional(),
    type: z.string().optional(),
    unreadCount: z.number().optional(),
    fullName: z.string().optional(),
    contactName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    dateAdded: z.number().optional(),
    dateUpdated: z.number().optional(),
    lastMessageDate: z.number().optional(),
    companyName: z.string().optional(),
    tags: z.array(z.string()).optional(),
    followers: z.array(z.unknown()).optional(),
    mentions: z.array(z.unknown()).optional(),
    isLastMessageInternalComment: z.boolean().optional(),
    profilePhoto: z.string().optional(),
    attributed: z.boolean().optional(),
    scoring: z.array(z.unknown()).optional(),
    messageTypes: z.array(z.number()).optional()
});

const CheckpointSchema = z.object({
    start_after_date: z.number()
});

const CheckpointParseSchema = z.object({
    start_after_date: z.number().optional()
});

const LIMIT = 100;

const sync = createSync({
    description: 'Sync conversations from HighLevel',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Conversation: ConversationSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointParseSchema.parse(rawCheckpoint || {});
        const startAfterDate = checkpoint.start_after_date;

        const rawMetadata = await nango.getMetadata();
        const metadata = z
            .object({
                locationId: z.string()
            })
            .parse(rawMetadata);
        const locationId = metadata.locationId;
        if (!locationId) {
            throw new Error('locationId is required in metadata');
        }

        let cursor = startAfterDate;
        let hasMore = true;

        while (hasMore) {
            const response = await nango.get({
                // https://highlevel.stoplight.io/docs/integrations/Search-Conversations
                endpoint: 'conversations/search',
                params: {
                    locationId,
                    limit: LIMIT,
                    sort: 'asc',
                    sortBy: 'last_message_date',
                    ...(cursor !== undefined && { startAfterDate: cursor })
                },
                headers: {
                    Version: '2021-07-28'
                },
                retries: 3
            });

            const page = ProviderSearchResponseSchema.parse(response.data);
            const conversations = page.conversations;

            if (conversations.length === 0) {
                hasMore = false;
                continue;
            }

            const records = conversations.map((conversation) => ({
                id: conversation.id,
                ...(conversation.locationId !== undefined && { locationId: conversation.locationId }),
                ...(conversation.contactId !== undefined && { contactId: conversation.contactId }),
                ...(conversation.lastMessageBody !== undefined && { lastMessageBody: conversation.lastMessageBody }),
                ...(conversation.lastMessageType !== undefined && { lastMessageType: conversation.lastMessageType }),
                ...(conversation.type !== undefined && { type: conversation.type }),
                ...(conversation.unreadCount !== undefined && { unreadCount: conversation.unreadCount }),
                ...(conversation.fullName !== undefined && { fullName: conversation.fullName }),
                ...(conversation.contactName !== undefined && { contactName: conversation.contactName }),
                ...(conversation.email != null && { email: conversation.email }),
                ...(conversation.phone != null && { phone: conversation.phone }),
                ...(conversation.dateAdded !== undefined && { dateAdded: conversation.dateAdded }),
                ...(conversation.dateUpdated !== undefined && { dateUpdated: conversation.dateUpdated }),
                ...(conversation.lastMessageDate !== undefined && { lastMessageDate: conversation.lastMessageDate }),
                ...(conversation.companyName != null && { companyName: conversation.companyName }),
                ...(conversation.tags !== undefined && { tags: conversation.tags }),
                ...(conversation.followers !== undefined && { followers: conversation.followers }),
                ...(conversation.mentions !== undefined && { mentions: conversation.mentions }),
                ...(conversation.isLastMessageInternalComment !== undefined && {
                    isLastMessageInternalComment: conversation.isLastMessageInternalComment
                }),
                ...(conversation.profilePhoto != null && { profilePhoto: conversation.profilePhoto }),
                ...(conversation.attributed != null && { attributed: conversation.attributed }),
                ...(conversation.scoring !== undefined && { scoring: conversation.scoring }),
                ...(conversation.messageTypes !== undefined && { messageTypes: conversation.messageTypes })
            }));

            await nango.batchSave(records, 'Conversation');

            const lastConversation = conversations[conversations.length - 1];
            if (!lastConversation) {
                hasMore = false;
                continue;
            }

            const lastSort = lastConversation.sort[0];
            if (lastSort === undefined) {
                hasMore = false;
                continue;
            }

            await nango.saveCheckpoint({
                start_after_date: lastSort
            });
            cursor = lastSort;

            if (conversations.length < LIMIT) {
                hasMore = false;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
