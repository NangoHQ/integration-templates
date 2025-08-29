import { createSync } from 'nango';
import { SlackChannel } from '../models.js';
import { z } from 'zod';

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
        const responses = await getAllPages(nango, 'conversations.list');

        const metadata = (await nango.getMetadata()) || {};

        const mappedChannels: SlackChannel[] = responses.map((record: any) => {
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

        // Now let's also join all public channels where we are not yet a member
        if (metadata['joinPublicChannels']) {
            await joinPublicChannels(nango, mappedChannels);
        }

        // Save channels
        await nango.batchSave(mappedChannels, 'SlackChannel');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

// Checks for public channels where the bot is not a member yet and joins them
async function joinPublicChannels(nango: NangoSyncLocal, channels: SlackChannel[]) {
    // Get ID of all channels where we are already a member
    const joinedChannelsResponse = await getAllPages(nango, 'users.conversations');
    const channelIds = joinedChannelsResponse.map((record: any) => {
        return record.id;
    });

    // For every public, not shared channel where we are not a member yet, join
    for (const channel of channels) {
        if (!channelIds.includes(channel.id) && channel.is_shared === false && channel.is_private === false) {
            await nango.post({
                endpoint: 'conversations.join',
                data: {
                    channel: channel.id
                },
                retries: 10
            });
        }
    }
}

async function getAllPages(nango: NangoSyncLocal, endpoint: string) {
    let nextCursor = 'x';
    let responses: any[] = [];

    while (nextCursor !== '') {
        const response = await nango.get({
            endpoint: endpoint,
            params: {
                limit: '200',
                cursor: nextCursor !== 'x' ? nextCursor : ''
            },
            retries: 10
        });

        if (!response.data.ok) {
            await nango.log(`Received a Slack API error (for ${endpoint}): ${JSON.stringify(response.data, null, 2)}`);
            return responses;
        }

        const { channels, response_metadata } = response.data;
        responses = responses.concat(channels);
        nextCursor = response_metadata.next_cursor;
    }

    return responses;
}
