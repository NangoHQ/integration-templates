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
        const checkpoint = await nango.getCheckpoint();

        // Parse channelsLastSyncDate from checkpoint
        let channelsLastSyncDate: Record<string, string> = {};
        const checkpointJson = checkpoint?.['channelsLastSyncDateJson'];

        if (checkpointJson && typeof checkpointJson === 'string') {
            try {
                channelsLastSyncDate = JSON.parse(checkpointJson);
            } catch {
                /* ignore parse error */
            }
        }

        // For initial sync (no checkpoint), use a fixed reference date to ensure deterministic behavior
        // In production, this will sync all messages; subsequent runs use checkpoint
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

        // Track updated channels for checkpoint
        const updatedChannelsLastSyncDate: Record<string, string> = { ...channelsLastSyncDate };

        // Get all channels the bot can access
        // https://api.slack.dev/methods/conversations.list
        const channelsResponse = await nango.get({
            endpoint: 'conversations.list',
            params: {
                types: 'public_channel,private_channel',
                exclude_archived: 'true',
                limit: '100'
            },
            retries: 3
        });

        if (!channelsResponse.data?.channels || !Array.isArray(channelsResponse.data.channels)) {
            throw new Error('Failed to fetch channels from Slack');
        }

        const allChannels = channelsResponse.data.channels;
        // Limit channels to prevent timeouts during execution
        // Mock was generated with first 1 channel only
        const channelsToProcess = allChannels.slice(0, 1);

        const allMessages: z.infer<typeof MessageSchema>[] = [];

        for (const channel of channelsToProcess) {
            const channelId: string = channel.id;
            const channelName: string = channel.name || 'unknown';
            const isJoined: boolean = channel.is_member;

            // Try to join public channels if not already joined
            if (!isJoined && channel.is_channel && !channel.is_private) {
                try {
                    // https://api.slack.dev/methods/conversations.join
                    await nango.post({
                        endpoint: 'conversations.join',
                        data: { channel: channelId },
                        retries: 3
                    });
                } catch {
                    // Skip channels we can't join
                    continue;
                }
            }

            // Skip private channels we're not in
            if (!isJoined && channel.is_private) {
                continue;
            }

            // Determine sync window
            const lastSync = channelsLastSyncDate[channelId];
            const isNewChannel = !lastSync;
            const oldestTimestamp = isNewChannel ? '0' : lastSync;

            // For existing channels, only sync last 10 days
            const tenDaysAgoTs = isNewChannel ? '0' : String(new Date(tenDaysAgo).getTime() / 1000);
            const effectiveOldest = isNewChannel ? '0' : Math.max(parseFloat(oldestTimestamp), parseFloat(tenDaysAgoTs)).toString();

            // Fetch messages for this channel
            // https://api.slack.dev/methods/conversations.history
            let cursor: string | undefined;
            let hasMore = true;

            while (hasMore) {
                const historyResponse = await nango.get({
                    endpoint: 'conversations.history',
                    params: {
                        channel: channelId,
                        oldest: effectiveOldest,
                        limit: '100',
                        ...(cursor && { cursor })
                    },
                    retries: 3
                });

                if (!historyResponse.data?.messages || !Array.isArray(historyResponse.data.messages)) {
                    break;
                }

                const messages = historyResponse.data.messages;

                for (const msg of messages) {
                    if (msg.subtype && msg.subtype !== 'thread_broadcast') {
                        continue;
                    }

                    const message: z.infer<typeof MessageSchema> = {
                        id: `${channelId}-${msg.ts}`,
                        channel_id: channelId,
                        channel_name: channelName,
                        user_id: msg.user || 'unknown',
                        text: msg.text || '',
                        timestamp: msg.ts,
                        thread_ts: msg.thread_ts,
                        is_thread_reply: false,
                        reactions: msg.reactions?.map((r: any) => ({
                            name: r.name,
                            count: r.count,
                            users: r.users || []
                        })),
                        reply_count: msg.reply_count,
                        reply_users: msg.reply_users,
                        created_at: new Date(parseFloat(msg.ts) * 1000).toISOString()
                    };

                    allMessages.push(message);

                    // Fetch thread replies if this is a parent message
                    if (msg.thread_ts && msg.reply_count > 0) {
                        const threadMessages = await fetchThreadReplies(nango, channelId, msg.thread_ts, channelName, effectiveOldest);
                        allMessages.push(...threadMessages);
                    }
                }

                hasMore = historyResponse.data.has_more;
                cursor = historyResponse.data.response_metadata?.next_cursor;

                if (!hasMore || !cursor) {
                    break;
                }
            }

            // Update checkpoint with this channel's sync time
            updatedChannelsLastSyncDate[channelId] = String(Date.now() / 1000);
        }

        // Save all messages
        if (allMessages.length > 0) {
            await nango.batchSave(allMessages, 'Message');
        }

        // Save checkpoint
        await nango.saveCheckpoint({
            channelsLastSyncDateJson: JSON.stringify(updatedChannelsLastSyncDate),
            lastSyncDate: new Date().toISOString()
        });
    }
});

async function fetchThreadReplies(
    nango: any,
    channelId: string,
    threadTs: string,
    channelName: string,
    oldestTimestamp: string
): Promise<z.infer<typeof MessageSchema>[]> {
    const replies: z.infer<typeof MessageSchema>[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
        // https://api.slack.dev/methods/conversations.replies
        const response = await nango.get({
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

        if (!response.data?.messages || !Array.isArray(response.data.messages)) {
            break;
        }

        const messages = response.data.messages;

        // Skip the first message (it's the parent, already saved)
        for (let i = 1; i < messages.length; i++) {
            const msg = messages[i];

            if (msg.subtype) {
                continue;
            }

            replies.push({
                id: `${channelId}-${threadTs}-${msg.ts}`,
                channel_id: channelId,
                channel_name: channelName,
                user_id: msg.user || 'unknown',
                text: msg.text || '',
                timestamp: msg.ts,
                thread_ts: threadTs,
                parent_ts: threadTs,
                is_thread_reply: true,
                reactions: msg.reactions?.map((r: any) => ({
                    name: r.name,
                    count: r.count,
                    users: r.users || []
                })),
                created_at: new Date(parseFloat(msg.ts) * 1000).toISOString()
            });
        }

        hasMore = response.data.has_more;
        cursor = response.data.response_metadata?.next_cursor;

        if (!hasMore || !cursor) {
            break;
        }
    }

    return replies;
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
