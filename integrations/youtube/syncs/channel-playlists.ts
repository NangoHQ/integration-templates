import { createSync } from 'nango';
import { z } from 'zod';

const ChannelPlaylistSchema = z.object({
    id: z.string().describe('The ID that YouTube uses to uniquely identify the playlist'),
    channelId: z.string().describe('The ID of the channel that owns the playlist'),
    channelTitle: z.string().optional().describe('The channel title of the channel that owns the playlist'),
    title: z.string().describe('The playlist title'),
    description: z.string().optional().describe('The playlist description'),
    privacyStatus: z.string().optional().describe('The playlist privacy status: private, public, or unlisted'),
    itemCount: z.number().optional().describe('The number of videos in the playlist'),
    publishedAt: z.string().describe('The date and time that the playlist was created'),
    thumbnailUrl: z.string().optional().describe('URL of the default thumbnail for the playlist')
});

const CheckpointSchema = z.object({
    channel_id: z.string(),
    channel_index: z.number().int().nonnegative(),
    page_token: z.string()
});

const MetadataSchema = z.object({
    channelIds: z.array(z.string()).optional()
});

type PlaylistItem = {
    id: string;
    snippet?: {
        publishedAt?: string;
        channelId?: string;
        title?: string;
        description?: string;
        thumbnails?: Record<string, { url?: string; width?: number; height?: number }>;
        channelTitle?: string;
        defaultLanguage?: string;
    };
    status?: {
        privacyStatus?: string;
    };
    contentDetails?: {
        itemCount?: number;
    };
};

const sync = createSync({
    description: 'Sync playlists for YouTube channels in scope',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/channel-playlists' }],
    models: {
        ChannelPlaylist: ChannelPlaylistSchema
    },
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = parsedCheckpoint?.success ? parsedCheckpoint.data : null;

        // Get channel IDs from metadata
        let metadata: z.infer<typeof MetadataSchema> = {};
        // @allowTryCatch Metadata is optional and may be absent in local dryruns.
        try {
            metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
        } catch {
            metadata = {};
        }
        const channelIds = metadata.channelIds ?? [];

        if (channelIds.length === 0) {
            // Blocker: No channel IDs provided in metadata
            // The sync requires channel IDs to fetch playlists
            return;
        }

        let startChannelIndex = 0;
        let startPageToken: string | undefined;

        if (checkpoint && channelIds[checkpoint.channel_index] === checkpoint.channel_id) {
            startChannelIndex = checkpoint.channel_index;
            startPageToken = checkpoint.page_token.length > 0 ? checkpoint.page_token : undefined;
        }

        // Start delete tracking for full refresh
        // Blocker: YouTube playlists.list does not support timestamp-based filtering
        // We must fetch all playlists and use deletion detection, while resuming with pageToken.
        await nango.trackDeletesStart('ChannelPlaylist');
        let checkpointSaved = false;
        const hadExistingCheckpoint = checkpoint !== null;

        for (let channelIndex = startChannelIndex; channelIndex < channelIds.length; channelIndex++) {
            const channelId = channelIds[channelIndex];
            if (!channelId) {
                continue;
            }
            let pageToken = channelIndex === startChannelIndex ? startPageToken : undefined;

            while (true) {
                // https://developers.google.com/youtube/v3/docs/playlists/list
                const response = await nango.get({
                    endpoint: '/youtube/v3/playlists',
                    params: {
                        part: 'snippet,contentDetails,status',
                        channelId,
                        maxResults: 50,
                        ...(pageToken && { pageToken })
                    },
                    retries: 3
                });

                const rawItems: PlaylistItem[] = Array.isArray(response.data?.items) ? response.data.items : [];
                const playlists = rawItems.map((item) => {
                    const snippet = item.snippet;
                    const thumbnails = snippet?.thumbnails;
                    const defaultThumbnail = thumbnails ? thumbnails['default'] : undefined;

                    return {
                        id: item.id,
                        channelId: snippet?.channelId ?? channelId,
                        channelTitle: snippet?.channelTitle,
                        title: snippet?.title ?? '',
                        description: snippet?.description,
                        privacyStatus: item.status?.privacyStatus,
                        itemCount: item.contentDetails?.itemCount,
                        publishedAt: snippet?.publishedAt ?? new Date().toISOString(),
                        thumbnailUrl: defaultThumbnail?.url
                    };
                });

                if (playlists.length > 0) {
                    await nango.batchSave(playlists, 'ChannelPlaylist');
                }

                const nextPageToken = response.data?.nextPageToken;
                if (typeof nextPageToken === 'string' && nextPageToken.length > 0) {
                    pageToken = nextPageToken;
                    await nango.saveCheckpoint({
                        channel_id: channelId,
                        channel_index: channelIndex,
                        page_token: nextPageToken
                    });
                    checkpointSaved = true;
                    continue;
                }

                const nextChannelId = channelIds[channelIndex + 1];
                if (nextChannelId) {
                    await nango.saveCheckpoint({
                        channel_id: nextChannelId,
                        channel_index: channelIndex + 1,
                        page_token: ''
                    });
                    checkpointSaved = true;
                }

                break;
            }
        }

        if (checkpointSaved || hadExistingCheckpoint) {
            await nango.clearCheckpoint();
        }
        await nango.trackDeletesEnd('ChannelPlaylist');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
