import { createSync } from 'nango';
import { createHash } from 'crypto';

import type { ProxyConfiguration } from 'nango';
import { SlackMessage, SlackMessageReply, SlackMessageReaction, SlackMessageMetadata } from '../models.js';
import type { SlackMessageResponse } from '../types.js';

interface Metadata {
    [key: string]: unknown;
    channelsLastSyncDate?: Record<string, string>;
}

interface Channel {
    id: string;
}

const sync = createSync({
    description:
        'Syncs Slack messages, thread replies and reactions from messages &\nthread replies for all channels, group dms and dms the bot is a part\nof. For every channel it will do an initial full sync on first\ndetection of the channel. For subsequent runs it will sync messages,\nthreads & reactions from the last 10 days. Scopes required:\nchannels:read, and at least one of\nchannels:history, groups:history, mpim:history, im:history',
    version: '2.0.1',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/messages',
            group: 'Messages'
        },
        {
            method: 'GET',
            path: '/messages-reply'
        },
        {
            method: 'GET',
            path: '/messages-reaction'
        }
    ],

    scopes: ['channels:read', 'channels:history'],

    models: {
        SlackMessage: SlackMessage,
        SlackMessageReply: SlackMessageReply,
        SlackMessageReaction: SlackMessageReaction
    },

    metadata: SlackMessageMetadata,

    exec: async (nango) => {
        let metadata: Metadata = (await nango.getMetadata()) || {};
        const channelsLastSyncDate: Record<string, string> = metadata['channelsLastSyncDate'] || {};
        const unseenChannels = new Set<string>(Object.keys(channelsLastSyncDate));

        // Initialize batch arrays for different model types
        // Using batch sizes of ~50 records to avoid memory issues and save data frequently
        let batchMessages: SlackMessage[] = [];
        let batchMessageReply: SlackMessageReply[] = [];
        
        const BATCH_SIZE = 50;
        const channelsRequestConfig: ProxyConfiguration = {
            // https://api.slack.com/methods/users.conversations
            endpoint: 'users.conversations',
            paginate: {
                limit: 200,
                response_path: 'channels'
            },
            retries: 10
        };

        // For every channel read messages, replies & reactions
        for await (const currentChannel of getEntries(nango.paginate<Channel>(channelsRequestConfig))) {
            const channelSyncTimestamp = channelsLastSyncDate[currentChannel.id]
                ? new Date(new Date().setDate(new Date().getDate() - 10)).getTime() / 1000
                : '';
            channelsLastSyncDate[currentChannel.id] = new Date().toString();

            // Keep track of channels we no longer saw in the API
            unseenChannels.delete(currentChannel.id);

            await nango.log(
                `Processing channel: ${currentChannel.id} - ${
                    channelSyncTimestamp === '' ? 'Initial sync, getting whole history' : 'Incremential sync, re-syncing last 10 days'
                }`
            );

            const messagesRequestConfig: ProxyConfiguration = {
                // https://api.slack.com/methods/conversations.history
                endpoint: 'conversations.history',
                params: {
                    channel: currentChannel['id'],
                    oldest: channelSyncTimestamp.toString()
                },
                retries: 10,
                paginate: {
                    limit: 15,
                    response_path: 'messages'
                }
            };

            for await (const message of getEntries(nango.paginate<SlackMessageResponse>(messagesRequestConfig))) {
                const mappedMessage: SlackMessage = {
                    id: createHash('sha256').update(`${message.ts}${currentChannel.id}`).digest('hex'),
                    ts: message.ts,
                    channel_id: currentChannel.id,
                    thread_ts: message.thread_ts ? message.thread_ts : null,
                    app_id: message.app_id ? message.app_id : null,
                    bot_id: message.bot_id ? message.bot_id : null,
                    display_as_bot: message.display_as_bot ? message.display_as_bot : null,
                    is_locked: message.is_locked ? message.is_locked : null,
                    metadata: {
                        event_type: message.type
                    },
                    parent_user_id: message.parent_user_id ? message.parent_user_id : null,
                    subtype: message.subtype ? message.subtype : null,
                    text: message.text ? message.text : null,
                    topic: message.topic ? message.topic : null,
                    user_id: message.user ? message.user : null,
                    raw_json: JSON.stringify(message, (k, v) => (k === 'block_id' ? undefined : v))
                };

                batchMessages.push(mappedMessage);

                if (batchMessages.length >= BATCH_SIZE) {
                    // Batch save as soon as we reach the batch size to prevent memory issues
                    await nango.batchSave(batchMessages, 'SlackMessage');
                    batchMessages = [];
                }

                // Save reactions if there are
                if (message.reactions) {
                    await saveReactions(nango, currentChannel.id, message);
                }

                // Replies to fetch?
                if (message.reply_count && message.reply_count > 0 && message.thread_ts) {
                    const messagesReplyRequestConfig: ProxyConfiguration = {
                        // https://api.slack.com/methods/conversations.replies
                        endpoint: 'conversations.replies',
                        params: {
                            channel: currentChannel.id,
                            ts: message.thread_ts
                        },
                        retries: 10,
                        paginate: {
                            limit: 15,
                            response_path: 'messages'
                        }
                    };

                    for await (const reply of getEntries(nango.paginate<SlackMessageResponse>(messagesReplyRequestConfig))) {
                        if (reply.ts === message.ts) {
                            continue;
                        }

                        const mappedReply: SlackMessageReply = {
                            id: createHash('sha256').update(`${reply.ts}${currentChannel.id}`).digest('hex'),
                            ts: reply.ts,
                            channel_id: currentChannel.id,
                            thread_ts: reply.thread_ts ? reply.thread_ts : null,
                            app_id: reply.app_id ? reply.app_id : null,
                            bot_id: reply.bot_id ? reply.bot_id : null,
                            display_as_bot: reply.display_as_bot ? reply.display_as_bot : null,
                            is_locked: reply.is_locked ? reply.is_locked : null,
                            metadata: {
                                event_type: reply.type
                            },
                            parent_user_id: reply.parent_user_id ? reply.parent_user_id : null,
                            subtype: reply.subtype ? reply.subtype : null,
                            text: reply.text ? reply.text : null,
                            topic: reply.topic ? reply.topic : null,
                            user_id: reply.user ? reply.user : null,
                            root: {
                                message_id: message.client_message_id,
                                ts: message.thread_ts
                            },
                            raw_json: JSON.stringify(reply, (k, v) => (k === 'block_id' ? undefined : v))
                        };

                        batchMessageReply.push(mappedReply);

                        if (batchMessageReply.length >= BATCH_SIZE) {
                            // Batch save as soon as we reach the batch size to prevent memory issues
                            await nango.batchSave(batchMessageReply, 'SlackMessageReply');
                            batchMessageReply = [];
                        }

                        // Save reactions if there are
                        if (reply.reactions) {
                            await saveReactions(nango, currentChannel.id, reply);
                        }
                    }
                }
            }
        }
        await nango.batchSave(batchMessages, 'SlackMessage');
        await nango.batchSave(batchMessageReply, 'SlackMessageReply');

        // Remove channels we no longer saw
        if (unseenChannels.size > 0) {
            for (const channel of unseenChannels) {
                delete channelsLastSyncDate[channel];
            }
        }

        // Store last sync date per channel
        metadata = (await nango.getMetadata()) || {}; // Re-read current metadata, in case it has been changed whilst the sync ran
        metadata['channelsLastSyncDate'] = channelsLastSyncDate;
        await nango.setMetadata(metadata);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function saveReactions(nango: NangoSyncLocal, currentChannelId: string, message: SlackMessageResponse) {
    if (!message.reactions) return;
    
    const batchReactions: SlackMessageReaction[] = [];
    const REACTION_BATCH_SIZE = 100;

    for (const reaction of message.reactions) {
        for (const user of reaction.users) {
            const mappedReaction: SlackMessageReaction = {
                id: createHash('sha256').update(`${message.ts}${reaction.name}${currentChannelId}${user}`).digest('hex'),
                message_ts: message.ts,
                channel_id: currentChannelId,
                user_id: user,
                thread_ts: message.thread_ts ? message.thread_ts : null,
                reaction_name: reaction.name
            };

            batchReactions.push(mappedReaction);
            
            if (batchReactions.length >= REACTION_BATCH_SIZE) {
                await nango.batchSave(batchReactions, 'SlackMessageReaction');
                batchReactions.length = 0;
            }
        }
    }

    if (batchReactions.length > 0) {
        await nango.batchSave(batchReactions, 'SlackMessageReaction');
    }
}

async function* getEntries<T>(generator: AsyncGenerator<T[]>): AsyncGenerator<T> {
    for await (const entry of generator) {
        for (const child of entry) {
            yield child;
        }
    }
}
