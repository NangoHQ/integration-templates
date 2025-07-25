import { createSync } from "nango";
import type { TeamsMessageResponse, TeamsAttachment, TeamsReaction, TeamsReply, Team, Channel, Chat } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { TeamsMessage, Metadata } from "../models.js";

const sync = createSync({
    description: "Continuously fetches messages from Microsoft Teams channels and chats.\nDetails: incremental sync, goes back 10 days on first sync, metadata tracks last sync per channel/chat.",
    version: "1.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/messages",
        group: "Messsages"
    }],

    scopes: ["ChannelMessage.Read.All", "Chat.Read.All"],

    models: {
        TeamsMessage: TeamsMessage
    },

    metadata: Metadata,

    exec: async nango => {
        let metadata = (await nango.getMetadata()) || { channelsLastSyncDate: {}, chatsLastSyncDate: {} };

        // Add robust type checks to ensure metadata fields are of type Record<string, string>

        // Function to check if an object is a Record<string, string>
        function isRecordStringString(obj: any): obj is Record<string, string> {
            return obj !== null && typeof obj === 'object' && Object.values(obj).every((value) => typeof value === 'string');
        }

        // Use the function to check the metadata fields
        const channelsLastSyncDate: Record<string, string> = isRecordStringString(metadata['channelsLastSyncDate']) ? metadata['channelsLastSyncDate'] : {};
        const chatsLastSyncDate: Record<string, string> = isRecordStringString(metadata['chatsLastSyncDate']) ? metadata['chatsLastSyncDate'] : {};

        // Fetch messages from channels
        await fetchMessagesFromChannels(nango, channelsLastSyncDate);

        // Fetch messages from chats
        await fetchMessagesFromChats(nango, chatsLastSyncDate);

        // Update metadata with current sync time
        metadata = (await nango.getMetadata()) || { channelsLastSyncDate: {}, chatsLastSyncDate: {} }; // Re-read metadata in case it was modified during sync
        metadata['channelsLastSyncDate'] = channelsLastSyncDate;
        metadata['chatsLastSyncDate'] = chatsLastSyncDate;
        await nango.setMetadata(metadata);
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

async function fetchMessagesFromChannels(nango: NangoSyncLocal, channelsLastSyncDate: Record<string, string>) {
    const teamsConfig: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/user-list-joinedteams?view=graph-rest-1.0&tabs=http
        endpoint: '/v1.0/me/joinedTeams',
        retries: 10
    };

    const { data: teams } = await nango.get<{ value: Team[] }>(teamsConfig);

    if (!teams?.value?.length) {
        await nango.log('No teams found');
        return;
    }

    for (const team of teams.value) {
        const channelsConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/channel-list?view=graph-rest-1.0&tabs=http
            endpoint: `/v1.0/teams/${team.id}/channels`,
            retries: 10
        };

        const { data: channels } = await nango.get<{ value: Channel[] }>(channelsConfig);

        if (!channels?.value?.length) {
            await nango.log(`No channels found for team ${team.id}`);
            continue;
        }

        for (const channel of channels.value) {
            const channelSyncDate = channelsLastSyncDate[channel.id];
            const tenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 10)).toISOString();
            const lastSync = channelSyncDate || tenDaysAgo;

            await nango.log(`Fetching messages for channel ${channel.id} since ${lastSync}`);

            const messagesConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0
                endpoint: `/v1.0/teams/${team.id}/channels/${channel.id}/messages`,
                params: {
                    $filter: `lastModifiedDateTime gt ${lastSync}`,
                    $expand: 'replies'
                },
                retries: 10
            };

            let batchMessages = [];

            // @allowTryCatch
            try {
                const { data: messages } = await nango.get<{ value: TeamsMessageResponse[] }>(messagesConfig);

                if (!messages?.value?.length) {
                    await nango.log(`No new messages found for channel ${channel.id}`);
                    continue;
                }

                for (const message of messages.value) {
                    const mappedMessage = {
                        id: message.id,
                        channelId: channel.id,
                        chatId: null,
                        content: message.body?.content,
                        createdDateTime: message.createdDateTime,
                        lastModifiedDateTime: message.lastModifiedDateTime,
                        deletedDateTime: message.deletedDateTime || null,
                        from: {
                            user: {
                                id: message.from?.user?.id,
                                displayName: message.from?.user?.displayName,
                                email: message.from?.user?.email
                            }
                        },
                        importance: message.importance,
                        messageType: message.messageType,
                        subject: message.subject,
                        webUrl: message.webUrl,
                        attachments:
                            message.attachments?.map((attachment: TeamsAttachment) => ({
                                id: attachment.id,
                                contentType: attachment.contentType,
                                contentUrl: attachment.contentUrl,
                                name: attachment.name,
                                thumbnailUrl: attachment.thumbnailUrl
                            })) || null,
                        reactions:
                            message.reactions?.map((reaction: TeamsReaction) => ({
                                reactionType: reaction.reactionType,
                                createdDateTime: reaction.createdDateTime,
                                user: {
                                    id: reaction.user.id,
                                    displayName: reaction.user.displayName,
                                    email: reaction.user.email
                                }
                            })) || null,
                        replies:
                            message.replies?.map((reply: TeamsReply) => ({
                                id: reply.id,
                                content: reply.body?.content,
                                createdDateTime: reply.createdDateTime,
                                from: {
                                    user: {
                                        id: reply.from?.user?.id,
                                        displayName: reply.from?.user?.displayName,
                                        email: reply.from?.user?.email
                                    }
                                }
                            })) || null,
                        raw_json: JSON.stringify(message)
                    };

                    batchMessages.push(mappedMessage);

                    if (batchMessages.length >= 50) {
                        await nango.batchSave(batchMessages, 'TeamsMessage');
                        batchMessages = [];
                    }
                }

                if (batchMessages.length > 0) {
                    await nango.batchSave(batchMessages, 'TeamsMessage');
                }

                channelsLastSyncDate = { ...channelsLastSyncDate, [channel.id]: new Date().toISOString() };
            } catch (error: unknown) {
                if (error instanceof Error) {
                    await nango.log(`Error fetching messages for channel ${channel.id}: ${error.message}`);
                } else {
                    await nango.log(`Unknown error fetching messages for channel ${channel.id}`);
                }
            }
        }
    }
}

async function fetchMessagesFromChats(nango: NangoSyncLocal, chatsLastSyncDate: Record<string, string>) {
    const chatsConfig: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0
        endpoint: '/v1.0/me/chats',
        retries: 10
    };

    const { data: chats } = await nango.get<{ value: Chat[] }>(chatsConfig);

    if (!chats?.value?.length) {
        await nango.log('No chats found');
        return;
    }

    for (const chat of chats.value) {
        const chatSyncDate = chatsLastSyncDate[chat.id];
        const tenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 10)).toISOString();
        const lastSync = chatSyncDate || tenDaysAgo;

        await nango.log(`Fetching messages for chat ${chat.id} since ${lastSync}`);

        const messagesConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0
            endpoint: `/v1.0/me/chats/${chat.id}/messages`,
            params: {
                $filter: `lastModifiedDateTime gt ${lastSync}`
            },
            retries: 10
        };

        let batchMessages = [];

        // @allowTryCatch
        try {
            const { data: messages } = await nango.get<{ value: TeamsMessageResponse[] }>(messagesConfig);

            if (!messages?.value?.length) {
                await nango.log(`No new messages found for chat ${chat.id}`);
                continue;
            }

            for (const message of messages.value) {
                const mappedMessage = {
                    id: message.id,
                    channelId: null,
                    chatId: chat.id,
                    content: message.body?.content,
                    createdDateTime: message.createdDateTime,
                    lastModifiedDateTime: message.lastModifiedDateTime,
                    deletedDateTime: message.deletedDateTime || null,
                    from: {
                        user: {
                            id: message.from?.user?.id,
                            displayName: message.from?.user?.displayName,
                            email: message.from?.user?.email
                        }
                    },
                    importance: message.importance,
                    messageType: message.messageType,
                    subject: message.subject,
                    webUrl: message.webUrl,
                    attachments:
                        message.attachments?.map((attachment: TeamsAttachment) => ({
                            id: attachment.id,
                            contentType: attachment.contentType,
                            contentUrl: attachment.contentUrl,
                            name: attachment.name,
                            thumbnailUrl: attachment.thumbnailUrl
                        })) || null,
                    reactions:
                        message.reactions?.map((reaction: TeamsReaction) => ({
                            reactionType: reaction.reactionType,
                            createdDateTime: reaction.createdDateTime,
                            user: {
                                id: reaction.user.id,
                                displayName: reaction.user.displayName,
                                email: reaction.user.email
                            }
                        })) || null,
                    replies: null, // Chat messages don't have replies
                    raw_json: JSON.stringify(message)
                };

                batchMessages.push(mappedMessage);

                if (batchMessages.length >= 50) {
                    await nango.batchSave(batchMessages, 'TeamsMessage');
                    batchMessages = [];
                }
            }

            if (batchMessages.length > 0) {
                await nango.batchSave(batchMessages, 'TeamsMessage');
            }

            chatsLastSyncDate = { ...chatsLastSyncDate, [chat.id]: new Date().toISOString() };
        } catch (error: unknown) {
            if (error instanceof Error) {
                await nango.log(`Error fetching messages for chat ${chat.id}: ${error.message}`);
            } else {
                await nango.log(`Unknown error fetching messages for chat ${chat.id}`);
            }
        }
    }
}
