import { createSync } from 'nango';
import { SlackChannel } from '../models.js';
import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import type { SlackChannelResponse, SlackChannelResponseFiltered } from '../types.js';

const sync = createSync({
    description:
        'Syncs information about all Slack channels. Which channels get synced\n(public, private, IMs, group DMs) depends on the scopes. If\njoinPublicChannels is set to true, the bot will automatically join all\npublic channels as well. Scopes: At least one of channels:read,\ngroups:read, mpim:read, im:read. To also join public channels:\nchannels:join',
    version: '2.0.1',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/channels'
        }
    ],

    scopes: ['channels:read', 'channels:join'],

    models: {
        SlackChannel: SlackChannel
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const metadata = (await nango.getMetadata()) || {};
        const publicChannelIds: string[] = [];

        const proxyConfig: ProxyConfiguration  = {
            // https://docs.slack.dev/reference/methods/conversations.list/
            endpoint: 'conversations.list',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'response_metadata.next_cursor',
                response_path: 'channels',
                limit: 200,
                limit_name_in_request: 'limit'
            },
            retries: 10
        };

        for await (const channels of nango.paginate<SlackChannelResponse>(proxyConfig)) {
            const mappedChannels: SlackChannel[] = channels.map((record) => {
                return {
                    id: record.id,
                    name: record.name,
                    is_channel: record.is_channel,
                    is_group: record.is_group,
                    is_im: record.is_im,
                    created: record.created,
                    creator: record.creator,
                    is_archived: record.is_archived,
                    is_general: record.is_general,
                    name_normalized: record.name_normalized,
                    is_shared: record.is_shared,
                    is_private: record.is_private,
                    is_mpim: record.is_mpim,
                    updated: record.updated,
                    num_members: record.num_members,
                    raw_json: JSON.stringify(record)
                };
            });

            if (mappedChannels.length > 0) {
                await nango.batchSave(mappedChannels, 'SlackChannel');
                if (metadata['joinPublicChannels']) {
                    const publicIds = mappedChannels
                        .filter(channel => channel.is_shared === false && channel.is_private === false)
                        .map(channel => channel.id);
                    publicChannelIds.push(...publicIds);
                }
            }
        }

        // Now let's also join all public channels where we are not yet a member
        if (metadata['joinPublicChannels'] && publicChannelIds.length > 0) {
            await joinPublicChannels(nango, publicChannelIds);
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

// Checks for public channels where the bot is not a member yet and joins them
async function joinPublicChannels(nango: NangoSyncLocal, publicChannelIds: string[]) {
    // Get ID of all channels where we are already a member
    const joinedChannelIds = new Set<string>();
    
    const proxyConfig: ProxyConfiguration = {
        // https://api.slack.com/methods/users.conversations
        endpoint: 'users.conversations',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'response_metadata.next_cursor',
            response_path: 'channels',
            limit: 200,
            limit_name_in_request: 'limit'
        },
        retries: 10
    };

    for await (const joinedChannels of nango.paginate<SlackChannelResponseFiltered>(proxyConfig)) {
        for (const record of joinedChannels) joinedChannelIds.add(record.id);
    }

    for (const channelId of publicChannelIds) {
        if (!joinedChannelIds.has(channelId)) {
            await nango.post({
                endpoint: 'conversations.join',
                data: {
                    channel: channelId
                },
                retries: 10
            });
        }
    }
}
