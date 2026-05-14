import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    botToken: z.string(),
    channelId: z.string()
});

const RawMessageSchema = z.object({
    id: z.string(),
    channel_id: z.string(),
    author: z.object({
        id: z.string(),
        username: z.string()
    }),
    content: z.string(),
    timestamp: z.string(),
    edited_timestamp: z.string().nullable().optional(),
    type: z.number()
});

const MessageSchema = z.object({
    id: z.string(),
    channel_id: z.string(),
    author_id: z.string(),
    author_username: z.string(),
    content: z.string(),
    timestamp: z.string(),
    edited_timestamp: z.string().optional(),
    type: z.number()
});

const LegacyCheckpointSchema = z.object({
    last_message_id: z.string(),
    before: z.string()
});

const CheckpointSchema = LegacyCheckpointSchema.extend({
    sync_after_message_id: z.string()
});

const EMPTY_CHECKPOINT: z.infer<typeof CheckpointSchema> = {
    last_message_id: '',
    before: '',
    sync_after_message_id: ''
};

function parseCheckpoint(data: unknown): z.infer<typeof CheckpointSchema> {
    const parsed = CheckpointSchema.safeParse(data);
    if (parsed.success) {
        return parsed.data;
    }

    const legacy = LegacyCheckpointSchema.safeParse(data);
    if (legacy.success) {
        return {
            ...legacy.data,
            sync_after_message_id: ''
        };
    }

    return EMPTY_CHECKPOINT;
}

function parseMessages(data: unknown): Array<z.infer<typeof RawMessageSchema>> | null {
    const parsed = z.array(RawMessageSchema).safeParse(data);
    if (!parsed.success) {
        return null;
    }
    return parsed.data;
}

function isNewerMessageId(messageId: string, referenceMessageId: string): boolean {
    return BigInt(messageId) > BigInt(referenceMessageId);
}

function mapMessage(raw: z.infer<typeof RawMessageSchema>): z.infer<typeof MessageSchema> {
    return {
        id: raw.id,
        channel_id: raw.channel_id,
        author_id: raw.author.id,
        author_username: raw.author.username,
        content: raw.content,
        timestamp: raw.timestamp,
        ...(raw.edited_timestamp != null && { edited_timestamp: raw.edited_timestamp }),
        type: raw.type
    };
}

const sync = createSync({
    description: 'Sync messages from Discord.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: false,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        Message: MessageSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/messages' }],

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata) {
            await nango.log('Missing metadata');
            return;
        }

        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            await nango.log('Missing botToken or channelId in metadata');
            return;
        }

        const checkpoint = parseCheckpoint(await nango.getCheckpoint());
        const channelId = parsedMetadata.data.channelId;
        const botToken = parsedMetadata.data.botToken;
        const pageSize = 100;
        const lowerBoundMessageId = checkpoint.before ? checkpoint.sync_after_message_id : checkpoint.last_message_id;
        let newestMessageId = checkpoint.before ? checkpoint.last_message_id : '';
        let before = checkpoint.before;

        // Discord only allows one pagination cursor per request. Start with `after`
        // for incremental discovery, then continue with `before` while filtering by
        // the previous high-watermark so runs over 100 messages stay complete.
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
        while (true) {
            const params: Record<string, string | number> = {
                limit: pageSize,
                ...(before ? { before } : lowerBoundMessageId ? { after: lowerBoundMessageId } : {})
            };

            const response = await nango.get({
                // https://discord.com/developers/docs/resources/channel#get-channel-messages
                endpoint: `/api/v10/channels/${channelId}/messages`,
                headers: {
                    Authorization: `Bot ${botToken}`
                },
                params,
                retries: 3
            });

            const rawMessages = parseMessages(response.data);
            if (!rawMessages) {
                await nango.log('Unexpected response format from Discord messages endpoint');
                return;
            }

            if (rawMessages.length === 0) {
                if (before && newestMessageId) {
                    await nango.saveCheckpoint({
                        last_message_id: newestMessageId,
                        before: '',
                        sync_after_message_id: ''
                    });
                }
                break;
            }

            const firstMessage = rawMessages[0];
            if (firstMessage && !newestMessageId) {
                newestMessageId = firstMessage.id;
            }

            const messagesToSave = lowerBoundMessageId ? rawMessages.filter((message) => isNewerMessageId(message.id, lowerBoundMessageId)) : rawMessages;

            if (messagesToSave.length > 0) {
                const messages = messagesToSave.map(mapMessage);
                await nango.batchSave(messages, 'Message');
            }

            const reachedExistingBoundary = lowerBoundMessageId.length > 0 && messagesToSave.length < rawMessages.length;
            if (rawMessages.length < pageSize || reachedExistingBoundary) {
                if (newestMessageId) {
                    await nango.saveCheckpoint({
                        last_message_id: newestMessageId,
                        before: '',
                        sync_after_message_id: ''
                    });
                }
                break;
            }

            const lastMessage = rawMessages[rawMessages.length - 1];
            if (!lastMessage) {
                break;
            }

            before = lastMessage.id;
            if (newestMessageId) {
                await nango.saveCheckpoint({
                    last_message_id: newestMessageId,
                    before,
                    sync_after_message_id: lowerBoundMessageId
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
