import { createSync } from 'nango';
import { z } from 'zod';

const ProviderConversationSchema = z.object({
    id: z.string(),
    locationId: z.string().nullish(),
    contactId: z.string().nullish(),
    lastMessageBody: z.string().nullish(),
    lastMessageType: z.string().nullish(),
    type: z.string().nullish(),
    unreadCount: z.number().nullish(),
    fullName: z.string().nullish(),
    contactName: z.string().nullish(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    dateAdded: z.number().nullish(),
    dateUpdated: z.number().nullish(),
    lastMessageDate: z.number().nullish(),
    companyName: z.string().nullable().optional(),
    tags: z.array(z.string()).nullish(),
    followers: z.array(z.unknown()).nullish(),
    mentions: z.array(z.unknown()).nullish(),
    isLastMessageInternalComment: z.boolean().nullish(),
    profilePhoto: z.string().nullable().optional(),
    attributed: z.boolean().nullable().optional(),
    scoring: z.array(z.unknown()).nullish(),
    messageTypes: z.array(z.number()).nullish(),
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
// Re-scan a trailing window on every run: HighLevel's conversation search only supports
// filtering/sorting by last_message_date, so a conversation that is edited (tags, assignment,
// read state) without a new message never gets a fresh last_message_date and would otherwise
// never be re-fetched once the cursor passes it.
const OVERLAP_MS = 60 * 60 * 1000;

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

        const connection = await nango.getConnection();
        const connectionSchema = z.object({
            connection_config: z.record(z.string(), z.unknown()).optional(),
            metadata: z.record(z.string(), z.unknown()).optional()
        });
        const parsedConnection = connectionSchema.safeParse(connection);

        let rawLocationId = parsedConnection.success
            ? (parsedConnection.data.connection_config?.['locationId'] ?? parsedConnection.data.metadata?.['locationId'])
            : undefined;
        if (typeof rawLocationId !== 'string') {
            const rawMetadata = await nango.getMetadata();
            const parsedMetadata = z.record(z.string(), z.unknown()).safeParse(rawMetadata);
            if (parsedMetadata.success) {
                rawLocationId = parsedMetadata.data['locationId'];
            }
        }
        if (typeof rawLocationId !== 'string') {
            throw new Error('locationId is required in connection configuration or metadata');
        }
        const locationId = rawLocationId;

        let cursor = startAfterDate;
        let hasMore = true;
        let advanced = false;

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
                ...(conversation.locationId != null && { locationId: conversation.locationId }),
                ...(conversation.contactId != null && { contactId: conversation.contactId }),
                ...(conversation.lastMessageBody != null && { lastMessageBody: conversation.lastMessageBody }),
                ...(conversation.lastMessageType != null && { lastMessageType: conversation.lastMessageType }),
                ...(conversation.type != null && { type: conversation.type }),
                ...(conversation.unreadCount != null && { unreadCount: conversation.unreadCount }),
                ...(conversation.fullName != null && { fullName: conversation.fullName }),
                ...(conversation.contactName != null && { contactName: conversation.contactName }),
                ...(conversation.email != null && { email: conversation.email }),
                ...(conversation.phone != null && { phone: conversation.phone }),
                ...(conversation.dateAdded != null && { dateAdded: conversation.dateAdded }),
                ...(conversation.dateUpdated != null && { dateUpdated: conversation.dateUpdated }),
                ...(conversation.lastMessageDate != null && { lastMessageDate: conversation.lastMessageDate }),
                ...(conversation.companyName != null && { companyName: conversation.companyName }),
                ...(conversation.tags != null && { tags: conversation.tags }),
                ...(conversation.followers != null && { followers: conversation.followers }),
                ...(conversation.mentions != null && { mentions: conversation.mentions }),
                ...(conversation.isLastMessageInternalComment != null && {
                    isLastMessageInternalComment: conversation.isLastMessageInternalComment
                }),
                ...(conversation.profilePhoto != null && { profilePhoto: conversation.profilePhoto }),
                ...(conversation.attributed != null && { attributed: conversation.attributed }),
                ...(conversation.scoring != null && { scoring: conversation.scoring }),
                ...(conversation.messageTypes != null && { messageTypes: conversation.messageTypes })
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
            advanced = true;

            if (conversations.length < LIMIT) {
                hasMore = false;
            }
        }

        // Seed the next run's cursor with a trailing overlap so recently active conversations
        // that were edited without a new message get re-fetched and re-saved with their latest state.
        // Only do this when the cursor actually advanced this run — otherwise an idle connection
        // would rewind its checkpoint by OVERLAP_MS on every run and eventually force a full resync.
        if (advanced && cursor !== undefined) {
            await nango.saveCheckpoint({
                start_after_date: Math.max(0, cursor - OVERLAP_MS)
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
