import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/en-us/graph/api/chatmessage-list-replies

const ChannelIdentitySchema = z.object({
    teamId: z.string().optional(),
    channelId: z.string().optional()
});

const TeamworkUserIdentitySchema = z.object({
    id: z.string().optional(),
    displayName: z.string().optional()
});

const FromSchema = z.object({
    user: TeamworkUserIdentitySchema.optional(),
    application: z.unknown().optional(),
    device: z.unknown().optional()
});

const BodySchema = z.object({
    contentType: z.string().optional(),
    content: z.string().optional()
});

const ProviderReplySchema = z.object({
    id: z.string(),
    replyToId: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    deletedDateTime: z.string().nullable().optional(),
    from: FromSchema.optional(),
    body: BodySchema.optional(),
    channelIdentity: ChannelIdentitySchema.optional(),
    messageType: z.string().optional(),
    importance: z.string().optional(),
    webUrl: z.string().optional()
});

const ProviderReplyListSchema = z.object({
    value: z.array(ProviderReplySchema),
    '@odata.nextLink': z.string().optional()
});

const ChannelMessageReplySchema = z.object({
    id: z.string(),
    parentMessageId: z.string(),
    channelId: z.string().optional(),
    teamId: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    deletedDateTime: z.string().optional(),
    fromUserId: z.string().optional(),
    fromUserDisplayName: z.string().optional(),
    contentType: z.string().optional(),
    content: z.string().optional(),
    messageType: z.string().optional(),
    importance: z.string().optional(),
    webUrl: z.string().optional()
});

const MetadataParentMessageSchema = z.object({
    teamId: z.string(),
    channelId: z.string(),
    messageId: z.string()
});

type MetadataParentMessage = z.infer<typeof MetadataParentMessageSchema>;

// Checkpoint schema - values must be ZodString | ZodNumber | ZodBoolean (no optional)
// Use -1 as sentinel for "not set" on parentIndex, empty string for nextLink
const CheckpointSchema = z.object({
    parentIndex: z.number().int().min(-1),
    nextLink: z.string()
});

const sync = createSync<{ ChannelMessageReply: typeof ChannelMessageReplySchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync replies for selected channel message threads',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        ChannelMessageReply: ChannelMessageReplySchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/channel-message-replies'
        }
    ],

    exec: async (nango) => {
        // Validate and extract metadata
        let metadataRaw: unknown = null;
        try {
            metadataRaw = await nango.getMetadata();
        } catch {
            metadataRaw = null;
        }
        const metadataGuarded = typeof metadataRaw === 'object' && metadataRaw !== null ? metadataRaw : {};
        const parentMessagesFromMetadata =
            'parentMessages' in metadataGuarded && Array.isArray(metadataGuarded.parentMessages) ? metadataGuarded.parentMessages : [];
        const parentMessagesRaw = parentMessagesFromMetadata;

        const parentMessagesParsed: MetadataParentMessage[] = parentMessagesRaw
            .map((pm: unknown) => {
                const parsed = MetadataParentMessageSchema.safeParse(pm);
                return parsed.success ? parsed.data : null;
            })
            .filter((pm): pm is MetadataParentMessage => pm !== null);

        if (parentMessagesParsed.length === 0) {
            await nango.log('No parent messages found in metadata to fetch replies for');
            return;
        }

        // Reset pagination so a resumed run always scans all parent messages from
        // the start — skipping earlier messages would cause trackDeletesEnd to
        // falsely delete their replies.
        await nango.saveCheckpoint({ parentIndex: -1, nextLink: '' });
        await nango.trackDeletesStart('ChannelMessageReply');

        try {
            for (let parentIndex = 0; parentIndex < parentMessagesParsed.length; parentIndex += 1) {
                const parent = parentMessagesParsed[parentIndex];

                if (!parent) {
                    continue;
                }

                await nango.log(`Fetching replies for message ${parent.messageId} in channel ${parent.channelId} (team ${parent.teamId})`);

                let nextLink: string | undefined;

                do {
                    // https://learn.microsoft.com/en-us/graph/api/chatmessage-list-replies
                    const endpoint = nextLink || `/teams/${parent.teamId}/channels/${parent.channelId}/messages/${parent.messageId}/replies`;

                    const proxyConfig: ProxyConfiguration = {
                        // https://learn.microsoft.com/en-us/graph/api/chatmessage-list-replies
                        endpoint,
                        retries: 3
                    };

                    if (!nextLink) {
                        proxyConfig.params = { $top: 50 };
                    }

                    const response = await nango.get(proxyConfig);
                    const parsed = ProviderReplyListSchema.parse(response.data);

                    const replies = parsed.value.map((reply) => ({
                        id: reply.id,
                        parentMessageId: parent.messageId,
                        channelId: reply.channelIdentity?.channelId ?? parent.channelId,
                        teamId: reply.channelIdentity?.teamId ?? parent.teamId,
                        createdDateTime: reply.createdDateTime,
                        lastModifiedDateTime: reply.lastModifiedDateTime,
                        deletedDateTime: reply.deletedDateTime ?? undefined,
                        fromUserId: reply.from?.user?.id,
                        fromUserDisplayName: reply.from?.user?.displayName,
                        contentType: reply.body?.contentType,
                        content: reply.body?.content,
                        messageType: reply.messageType,
                        importance: reply.importance,
                        webUrl: reply.webUrl
                    }));

                    if (replies.length > 0) {
                        await nango.batchSave(replies, 'ChannelMessageReply');
                        await nango.log(`Saved ${replies.length} replies for message ${parent.messageId}`);
                    }

                    nextLink = parsed['@odata.nextLink'];

                    if (nextLink) {
                        await nango.saveCheckpoint({ parentIndex, nextLink });
                    } else if (parentIndex < parentMessagesParsed.length - 1) {
                        await nango.saveCheckpoint({ parentIndex: parentIndex + 1, nextLink: '' });
                    }
                } while (nextLink);
            }
        } finally {
            await nango.saveCheckpoint({ parentIndex: -1, nextLink: '' });
            await nango.trackDeletesEnd('ChannelMessageReply');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
