import type { NangoSync, SlackMessage, SlackMessageReaction, SlackMessageReply, ProxyConfiguration } from '../../models';
import { createHash } from 'crypto';

interface Metadata {
    [key: string]: unknown;
    channelsLastSyncDate?: Record<string, string>;
}

interface Channel {
    id: string;
}

export default async function fetchData(nango: NangoSync) {
    let metadata: Metadata = (await nango.getMetadata()) || {};
    const channelsLastSyncDate: Record<string, string> = metadata['channelsLastSyncDate'] || {};
    const unseenChannels: string[] = Object.keys(channelsLastSyncDate);

    // Initialize batch arrays for different model types
    // Using batch sizes of ~50 records to avoid memory issues and save data frequently
    let batchMessages: SlackMessage[] = [];
    let batchMessageReply: SlackMessageReply[] = [];

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
        const channelSyncTimestamp = channelsLastSyncDate[currentChannel.id] ? new Date(new Date().setDate(new Date().getDate() - 10)).getTime() / 1000 : '';
        channelsLastSyncDate[currentChannel.id] = new Date().toString();

        // Keep track of channels we no longer saw in the API
        if (unseenChannels.includes(currentChannel.id)) {
            unseenChannels.splice(unseenChannels.indexOf(currentChannel.id), 1);
        }

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

        for await (const message of getEntries(nango.paginate(messagesRequestConfig))) {
            const messageForRawJson = removeBlockIds(message);

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
                raw_json: JSON.stringify(messageForRawJson)
            };

            batchMessages.push(mappedMessage);

            if (batchMessages.length > 49) {
                // Batch save as soon as we reach 50 records to prevent memory issues
                await nango.batchSave<SlackMessage>(batchMessages, 'SlackMessage');
                batchMessages = [];
            }

            // Save reactions if there are
            if (message.reactions) {
                await saveReactions(nango, currentChannel.id, message);
            }

            // Replies to fetch?
            if (message.reply_count > 0) {
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

                for await (const reply of getEntries(nango.paginate(messagesReplyRequestConfig))) {
                    if (reply.ts === message.ts) {
                        continue;
                    }

                    const replyForRawJson = removeBlockIds(reply);

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
                        raw_json: JSON.stringify(replyForRawJson)
                    };

                    batchMessageReply.push(mappedReply);

                    if (batchMessageReply.length > 49) {
                        // Batch save as soon as we reach 50 records to prevent memory issues
                        await nango.batchSave<SlackMessageReply>(batchMessageReply, 'SlackMessageReply');
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
    if (unseenChannels.length > 0) {
        for (const channel of unseenChannels) {
            delete channelsLastSyncDate[channel];
        }
    }

    // Store last sync date per channel
    metadata = (await nango.getMetadata()) || {}; // Re-read current metadata, in case it has been changed whilst the sync ran
    metadata['channelsLastSyncDate'] = channelsLastSyncDate;
    await nango.setMetadata(metadata);
}

async function saveReactions(nango: NangoSync, currentChannelId: string, message: any) {
    const batchReactions: SlackMessageReaction[] = [];

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
        }
    }

    await nango.batchSave<SlackMessageReaction>(batchReactions, 'SlackMessageReaction');
}

function removeBlockIds(data: any): any {
    // The block_id is not reliable and could change between two runs of this sync causing the messages to show as updated
    // We remove it from the raw_json to avoid unnecessary updates.
    // This can be reinstated if required by removing this function.
    if (Array.isArray(data)) {
        return data.map(removeBlockIds);
    }

    if (data && typeof data === 'object' && data !== null) {
        const newObj: Record<string, any> = {};
        for (const key of Object.keys(data)) {
            if (key === 'block_id') {
                continue;
            }
            newObj[key] = removeBlockIds(data[key]);
        }
        return newObj;
    }

    return data;
}

async function* getEntries<T>(generator: AsyncGenerator<T[]>): AsyncGenerator<T> {
    for await (const entry of generator) {
        for (const child of entry) {
            yield child;
        }
    }
}
