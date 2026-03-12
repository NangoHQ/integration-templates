import { createSync } from 'nango';
import { z } from 'zod';

const MessageSchema = z.object({
    id: z.string(),
    channel_id: z.string(),
    channel_name: z.string(),
    user_id: z.string(),
    user_name: z.string().optional(),
    text: z.string(),
    timestamp: z.string(),
    thread_ts: z.string().optional(),
    parent_ts: z.string().optional(),
    is_thread_reply: z.boolean().optional(),
    reactions: z
        .array(
            z.object({
                name: z.string(),
                count: z.number(),
                users: z.array(z.string())
            })
        )
        .optional(),
    reply_count: z.number().optional(),
    reply_users: z.array(z.string()).optional(),
    created_at: z.string()
});

// Use string for checkpoint since we need to store a record
const CheckpointSchema = z.object({
    channelsLastSyncDateJson: z.string(),
    lastSyncDate: z.string()
});

const sync = createSync({
    description:
        'Sync messages, thread replies, and reactions for conversations the bot can access; fully backfill new channels, then resync the last 10 days using channelsLastSyncDate metadata.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/sync-messages-received', group: 'Messages' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Message: MessageSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as z.infer<typeof CheckpointSchema> | null;
        const channelsLastSyncDate = parseChannelsLastSyncDate(checkpoint?.['channelsLastSyncDateJson']);
        const updatedChannelsLastSyncDate: Record<string, string> = { ...channelsLastSyncDate };
        const tenDaysAgoTimestamp = String(Math.floor((Date.now() - 10 * 24 * 60 * 60 * 1000) / 1000));

        const channelsToProcess: SlackChannel[] = [];
        let channelsCursor: string | undefined;

        while (true) {
            const channelsResponse = await nango.get<{
                channels?: SlackChannel[];
                response_metadata?: { next_cursor?: string };
            }>({
                // https://api.slack.dev/methods/conversations.list
                endpoint: 'conversations.list',
                params: {
                    types: 'public_channel,private_channel',
                    exclude_archived: 'true',
                    limit: '200',
                    ...(channelsCursor && { cursor: channelsCursor })
                },
                retries: 3
            });

            channelsToProcess.push(...(channelsResponse.data.channels ?? []));

            const nextChannelsCursor = channelsResponse.data.response_metadata?.next_cursor;
            if (!nextChannelsCursor) {
                break;
            }

            channelsCursor = nextChannelsCursor;
        }

        for (const channel of channelsToProcess) {
            const channelId = channel.id;
            const channelName = channel.name || 'unknown';
            let isJoined = channel.is_member === true;

            if (!isJoined && channel.is_channel && !channel.is_private) {
                try {
                    // https://api.slack.dev/methods/conversations.join
                    await nango.post({
                        endpoint: 'conversations.join',
                        data: { channel: channelId },
                        retries: 1
                    });
                    isJoined = true;
                } catch {
                    continue;
                }
            }

            if (!isJoined && channel.is_private) {
                continue;
            }

            const lastSync = channelsLastSyncDate[channelId];
            const effectiveOldest = !lastSync ? '0' : maxSlackTimestamp(lastSync, tenDaysAgoTimestamp)!;

            const channelMessages: z.infer<typeof MessageSchema>[] = [];
            let channelMaxTimestamp = lastSync;
            let historyCursor: string | undefined;

            while (true) {
                const historyResponse = await nango.get<{
                    messages?: SlackMessage[];
                    has_more?: boolean;
                    response_metadata?: { next_cursor?: string };
                }>({
                    // https://api.slack.dev/methods/conversations.history
                    endpoint: 'conversations.history',
                    params: {
                        channel: channelId,
                        oldest: effectiveOldest,
                        limit: '100',
                        ...(historyCursor && { cursor: historyCursor })
                    },
                    retries: 3
                });

                for (const message of historyResponse.data.messages ?? []) {
                    if (message.subtype && message.subtype !== 'thread_broadcast') {
                        continue;
                    }

                    channelMessages.push(mapSlackMessage(channelId, channelName, message));
                    channelMaxTimestamp = maxSlackTimestamp(channelMaxTimestamp, message.ts);

                    if (message.thread_ts && message.reply_count && message.reply_count > 0) {
                        const threadResult = await fetchThreadReplies(nango, channelId, message.thread_ts, channelName, effectiveOldest);
                        channelMessages.push(...threadResult.messages);
                        channelMaxTimestamp = maxSlackTimestamp(channelMaxTimestamp, threadResult.maxTimestamp);
                    }
                }

                const nextHistoryCursor = historyResponse.data.response_metadata?.next_cursor;
                if (!historyResponse.data.has_more || !nextHistoryCursor) {
                    break;
                }

                historyCursor = nextHistoryCursor;
            }

            if (channelMessages.length > 0) {
                await nango.batchSave(channelMessages, 'Message');
            }

            updatedChannelsLastSyncDate[channelId] = channelMaxTimestamp ?? String(Math.floor(Date.now() / 1000));
            await nango.saveCheckpoint({
                channelsLastSyncDateJson: JSON.stringify(updatedChannelsLastSyncDate),
                lastSyncDate: new Date().toISOString()
            });
        }
    }
});

type SlackChannel = {
    id: string;
    name?: string;
    is_member?: boolean;
    is_channel?: boolean;
    is_private?: boolean;
};

type SlackReaction = {
    name: string;
    count: number;
    users?: string[];
};

type SlackMessage = {
    ts: string;
    user?: string;
    text?: string;
    thread_ts?: string;
    subtype?: string;
    reactions?: SlackReaction[];
    reply_count?: number;
    reply_users?: string[];
};

async function fetchThreadReplies(
    nango: Parameters<(typeof sync)['exec']>[0],
    channelId: string,
    threadTs: string,
    channelName: string,
    oldestTimestamp: string
): Promise<{ messages: z.infer<typeof MessageSchema>[]; maxTimestamp: string | undefined }> {
    const replies: z.infer<typeof MessageSchema>[] = [];
    let maxTimestamp: string | undefined;
    let cursor: string | undefined;

    while (true) {
        const response = await nango.get<{
            messages?: SlackMessage[];
            has_more?: boolean;
            response_metadata?: { next_cursor?: string };
        }>({
            // https://api.slack.dev/methods/conversations.replies
            endpoint: 'conversations.replies',
            params: {
                channel: channelId,
                ts: threadTs,
                oldest: oldestTimestamp,
                limit: '100',
                ...(cursor && { cursor })
            },
            retries: 3
        });

        const messages = response.data.messages ?? [];
        for (let index = 1; index < messages.length; index++) {
            const message = messages[index]!;
            if (message.subtype) {
                continue;
            }

            replies.push({
                id: `${channelId}-${threadTs}-${message.ts}`,
                channel_id: channelId,
                channel_name: channelName,
                user_id: message.user || 'unknown',
                text: message.text || '',
                timestamp: message.ts,
                thread_ts: threadTs,
                parent_ts: threadTs,
                is_thread_reply: true,
                reactions: message.reactions?.map((reaction) => ({
                    name: reaction.name,
                    count: reaction.count,
                    users: reaction.users || []
                })),
                created_at: new Date(parseFloat(message.ts) * 1000).toISOString()
            });
            maxTimestamp = maxSlackTimestamp(maxTimestamp, message.ts);
        }

        const nextCursor = response.data.response_metadata?.next_cursor;
        if (!response.data.has_more || !nextCursor) {
            break;
        }

        cursor = nextCursor;
    }

    return {
        messages: replies,
        maxTimestamp
    };
}

function mapSlackMessage(channelId: string, channelName: string, message: SlackMessage): z.infer<typeof MessageSchema> {
    return {
        id: `${channelId}-${message.ts}`,
        channel_id: channelId,
        channel_name: channelName,
        user_id: message.user || 'unknown',
        text: message.text || '',
        timestamp: message.ts,
        thread_ts: message.thread_ts,
        is_thread_reply: false,
        reactions: message.reactions?.map((reaction) => ({
            name: reaction.name,
            count: reaction.count,
            users: reaction.users || []
        })),
        reply_count: message.reply_count,
        reply_users: message.reply_users,
        created_at: new Date(parseFloat(message.ts) * 1000).toISOString()
    };
}

function parseChannelsLastSyncDate(checkpointJson: string | undefined): Record<string, string> {
    if (!checkpointJson) {
        return {};
    }

    try {
        const parsed = JSON.parse(checkpointJson) as Record<string, unknown>;
        return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    } catch {
        return {};
    }
}

function maxSlackTimestamp(current: string | undefined, candidate: string | undefined): string | undefined {
    if (!candidate) {
        return current;
    }

    if (!current) {
        return candidate;
    }

    return parseFloat(candidate) > parseFloat(current) ? candidate : current;
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
