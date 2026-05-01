import { createSync } from 'nango';
import * as z from 'zod';

// https://developers.google.com/youtube/v3/docs/playlistItems
const PlaylistItemSchema = z.object({
    id: z.string(),
    playlist_id: z.string(),
    video_id: z.string(),
    position: z.number().int(),
    published_at: z.string(),
    channel_id: z.string().optional(),
    channel_title: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    privacy_status: z.string().optional(),
    video_owner_channel_id: z.string().optional(),
    video_owner_channel_title: z.string().optional(),
    video_published_at: z.string().optional()
});

// https://developers.google.com/youtube/v3/docs/playlistItems#resource
const YouTubePlaylistItemSchema = z.object({
    id: z.string(),
    snippet: z.object({
        publishedAt: z.string(),
        channelId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        channelTitle: z.string().optional(),
        playlistId: z.string(),
        position: z.number().int(),
        resourceId: z.object({
            kind: z.string(),
            videoId: z.string()
        }),
        videoOwnerChannelId: z.string().optional(),
        videoOwnerChannelTitle: z.string().optional()
    }),
    contentDetails: z
        .object({
            videoId: z.string(),
            videoPublishedAt: z.string().optional()
        })
        .optional(),
    status: z
        .object({
            privacyStatus: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    playlist_id: z.string(),
    page_token: z.string(),
    playlist_index: z.number().int().nonnegative()
});

const MetadataSchema = z.object({
    playlist_ids: z.array(z.string()).optional()
});

const sync = createSync({
    description: 'Sync items from YouTube playlists in scope',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/playlist-items' }],
    frequency: 'every hour',
    autoStart: true,
    models: {
        PlaylistItem: PlaylistItemSchema
    },
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = parsedCheckpoint?.success ? parsedCheckpoint.data : null;
        let rawMetadata: unknown;
        // @allowTryCatch Metadata is optional and may be absent in local dryruns.
        try {
            rawMetadata = await nango.getMetadata();
        } catch {
            rawMetadata = undefined;
        }

        // @allowTryCatch Metadata may not be set on first run
        let playlistIds: string[] = [];
        try {
            const parsed = MetadataSchema.parse(rawMetadata);
            playlistIds = parsed.playlist_ids ?? [];
        } catch {
            playlistIds = [];
        }

        if (playlistIds.length === 0) {
            await nango.log('No playlist_ids found in metadata, nothing to sync');
            return;
        }

        let startPlaylistIndex = 0;
        let startPageToken: string | undefined;

        if (checkpoint && playlistIds[checkpoint.playlist_index] === checkpoint.playlist_id) {
            startPlaylistIndex = checkpoint.playlist_index;
            startPageToken = checkpoint.page_token.length > 0 ? checkpoint.page_token : undefined;
        }

        // Blocker: YouTube playlistItems.list only supports full-list pagination by playlist and pageToken.
        // We use full-refresh deletion detection and checkpoint the current playlist/page for resume.
        await nango.trackDeletesStart('PlaylistItem');

        for (let i = startPlaylistIndex; i < playlistIds.length; i++) {
            const rawPlaylistId = playlistIds[i];
            if (!rawPlaylistId) {
                continue;
            }
            const playlistId: string = rawPlaylistId;
            let pageToken = i === startPlaylistIndex ? startPageToken : undefined;

            while (true) {
                const params: Record<string, string | number> = {
                    part: 'snippet,contentDetails,status',
                    playlistId,
                    maxResults: 50
                };
                if (pageToken) {
                    params['pageToken'] = pageToken;
                }

                // https://developers.google.com/youtube/v3/docs/playlistItems/list
                const response = await nango.get({
                    endpoint: '/youtube/v3/playlistItems',
                    params,
                    retries: 3
                });

                const rawItems = Array.isArray(response.data?.items) ? response.data.items : [];

                const items: z.infer<typeof PlaylistItemSchema>[] = [];

                for (const rawItem of rawItems) {
                    const parsedItem = YouTubePlaylistItemSchema.safeParse(rawItem);

                    if (!parsedItem.success) {
                        throw new Error(`Failed to parse playlist item: ${parsedItem.error.message}`);
                    }

                    const item = parsedItem.data;
                    const snippet = item.snippet;
                    const contentDetails = item.contentDetails;
                    const status = item.status;

                    items.push({
                        id: item.id,
                        playlist_id: snippet.playlistId,
                        video_id: contentDetails?.videoId ?? snippet.resourceId.videoId,
                        position: snippet.position,
                        published_at: snippet.publishedAt,
                        channel_id: snippet.channelId,
                        channel_title: snippet.channelTitle,
                        title: snippet.title,
                        description: snippet.description,
                        privacy_status: status?.privacyStatus,
                        video_owner_channel_id: snippet.videoOwnerChannelId,
                        video_owner_channel_title: snippet.videoOwnerChannelTitle,
                        video_published_at: contentDetails?.videoPublishedAt
                    });
                }

                if (items.length > 0) {
                    await nango.batchSave(items, 'PlaylistItem');
                }

                const nextPageToken = typeof response.data?.nextPageToken === 'string' ? response.data.nextPageToken : undefined;
                if (nextPageToken) {
                    pageToken = nextPageToken;
                    await nango.saveCheckpoint({
                        playlist_id: playlistId,
                        page_token: nextPageToken,
                        playlist_index: i
                    });
                    continue;
                }

                const nextPlaylistId = playlistIds[i + 1];
                if (nextPlaylistId) {
                    await nango.saveCheckpoint({
                        playlist_id: nextPlaylistId,
                        playlist_index: i + 1,
                        page_token: ''
                    });
                }

                break;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('PlaylistItem');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
