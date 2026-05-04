import { createSync } from 'nango';
import { z } from 'zod';

/**
 * Provider schemas match the YouTube API response structure
 * YouTube uses camelCase for field names
 */

const ChannelContentDetailsSchema = z.object({
    relatedPlaylists: z.object({
        uploads: z.string()
    })
});

const ChannelSchema = z.object({
    id: z.string(),
    contentDetails: ChannelContentDetailsSchema
});

const ChannelListResponseSchema = z.object({
    items: z.array(ChannelSchema).optional()
});

const PlaylistItemSnippetSchema = z.object({
    publishedAt: z.string(),
    title: z.string(),
    description: z.string(),
    thumbnails: z.record(z.string(), z.any()).optional(),
    resourceId: z.object({
        videoId: z.string()
    }),
    channelId: z.string(),
    playlistId: z.string(),
    position: z.number().optional()
});

const PlaylistItemSchema = z.object({
    id: z.string(),
    snippet: PlaylistItemSnippetSchema
});

const PlaylistItemListResponseSchema = z.object({
    items: z.array(PlaylistItemSchema).optional(),
    nextPageToken: z.string().optional()
});

const VideoSnippetSchema = z.object({
    publishedAt: z.string(),
    channelId: z.string(),
    title: z.string(),
    description: z.string(),
    thumbnails: z.record(z.string(), z.any()).optional(),
    channelTitle: z.string(),
    tags: z.array(z.string()).optional(),
    categoryId: z.string().optional()
});

const VideoStatisticsSchema = z.object({
    viewCount: z.string().optional(),
    likeCount: z.string().optional(),
    commentCount: z.string().optional()
});

const VideoStatusSchema = z.object({
    uploadStatus: z.string().optional(),
    privacyStatus: z.string().optional(),
    license: z.string().optional(),
    embeddable: z.boolean().optional(),
    publicStatsViewable: z.boolean().optional()
});

const VideoSchema = z.object({
    id: z.string(),
    snippet: VideoSnippetSchema.optional(),
    statistics: VideoStatisticsSchema.optional(),
    status: VideoStatusSchema.optional()
});

const VideoListResponseSchema = z.object({
    items: z.array(VideoSchema).optional()
});

/**
 * Normalized model for uploaded videos
 */
const UploadedVideoSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    channelId: z.string(),
    channelTitle: z.string().optional(),
    publishedAt: z.string(),
    playlistItemId: z.string(),
    position: z.number().optional(),
    thumbnails: z.record(z.string(), z.any()).optional(),
    tags: z.array(z.string()).optional(),
    categoryId: z.string().optional(),
    statistics: z
        .object({
            viewCount: z.string().optional(),
            likeCount: z.string().optional(),
            commentCount: z.string().optional()
        })
        .optional(),
    status: z
        .object({
            privacyStatus: z.string().optional(),
            uploadStatus: z.string().optional(),
            license: z.string().optional(),
            embeddable: z.boolean().optional()
        })
        .optional()
});

/**
 * Checkpoint schema for resuming a full refresh through uploads playlists.
 */
const CheckpointSchema = z.object({
    uploads_playlist_id: z.string(),
    uploads_playlist_index: z.number().int().nonnegative(),
    page_token: z.string()
});

/**
 * Sync uploaded videos for YouTube channels in scope.
 *
 * Checkpoint strategy:
 * - Uses uploads playlist index plus pageToken to resume a full refresh
 *
 * Delete strategy:
 * - Full refresh with trackDeletesStart/trackDeletesEnd because playlistItems.list
 *   and videos.list do not expose changed-since or deleted-record feeds.
 */
const sync = createSync({
    description: 'Sync uploaded videos for YouTube channels in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/uploaded-videos' }],
    checkpoint: CheckpointSchema,
    models: {
        UploadedVideo: UploadedVideoSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = parsedCheckpoint?.success ? parsedCheckpoint.data : null;

        // https://developers.google.com/youtube/v3/docs/channels/list
        const channelsResponse = await nango.get({
            endpoint: '/youtube/v3/channels',
            params: {
                part: 'contentDetails',
                mine: 'true'
            },
            retries: 3
        });

        const parsedChannels = ChannelListResponseSchema.safeParse(channelsResponse.data);
        if (!parsedChannels.success) {
            throw new Error(`Failed to parse channels response: ${parsedChannels.error.message}`);
        }

        const channels = parsedChannels.data.items ?? [];
        if (channels.length === 0) {
            return;
        }

        // Get uploads playlist IDs from all channels
        const uploadsPlaylistIds: string[] = [];
        for (const channel of channels) {
            const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
            if (uploadsPlaylistId) {
                uploadsPlaylistIds.push(uploadsPlaylistId);
            }
        }

        if (uploadsPlaylistIds.length === 0) {
            return;
        }

        let startUploadsPlaylistIndex = 0;
        let startPageToken: string | undefined;

        if (checkpoint && uploadsPlaylistIds[checkpoint.uploads_playlist_index] === checkpoint.uploads_playlist_id) {
            startUploadsPlaylistIndex = checkpoint.uploads_playlist_index;
            startPageToken = checkpoint.page_token.length > 0 ? checkpoint.page_token : undefined;
        }

        await nango.trackDeletesStart('UploadedVideo');

        // Process each uploads playlist
        for (let uploadsPlaylistIndex = startUploadsPlaylistIndex; uploadsPlaylistIndex < uploadsPlaylistIds.length; uploadsPlaylistIndex++) {
            const uploadsPlaylistId = uploadsPlaylistIds[uploadsPlaylistIndex];
            if (!uploadsPlaylistId) {
                continue;
            }
            let pageToken = uploadsPlaylistIndex === startUploadsPlaylistIndex ? startPageToken : undefined;

            while (true) {
                // https://developers.google.com/youtube/v3/docs/playlistItems/list
                const playlistConfig = {
                    endpoint: '/youtube/v3/playlistItems',
                    params: {
                        part: 'snippet',
                        playlistId: uploadsPlaylistId,
                        maxResults: '50',
                        ...(pageToken && { pageToken })
                    },
                    retries: 3
                };

                const playlistResponse = await nango.get(playlistConfig);

                const parsedPlaylist = PlaylistItemListResponseSchema.safeParse(playlistResponse.data);
                if (!parsedPlaylist.success) {
                    throw new Error(`Failed to parse playlist items response: ${parsedPlaylist.error.message}`);
                }

                const items = parsedPlaylist.data.items ?? [];
                const nextPageToken = parsedPlaylist.data.nextPageToken;

                // Collect video IDs for batch hydration
                const videoIds = items.map((item) => item.snippet.resourceId.videoId);

                // Hydrate videos in batches (max 50 per request per YouTube API)
                const videoDetailsMap = new Map<string, z.infer<typeof VideoSchema>>();
                const batchSize = 50;
                for (let i = 0; i < videoIds.length; i += batchSize) {
                    const batch = videoIds.slice(i, i + batchSize);
                    const idsParam = batch.join(',');

                    // https://developers.google.com/youtube/v3/docs/videos/list
                    const videosResponse = await nango.get({
                        endpoint: '/youtube/v3/videos',
                        params: {
                            part: 'snippet,statistics,status',
                            id: idsParam
                        },
                        retries: 3
                    });

                    const parsedVideos = VideoListResponseSchema.safeParse(videosResponse.data);
                    if (!parsedVideos.success) {
                        throw new Error(`Failed to parse videos response: ${parsedVideos.error.message}`);
                    }

                    for (const video of parsedVideos.data.items ?? []) {
                        videoDetailsMap.set(video.id, video);
                    }
                }

                // Map to normalized model
                const uploadedVideos = items.map((item) => {
                    const videoId = item.snippet.resourceId.videoId;
                    const videoDetails = videoDetailsMap.get(videoId);

                    return {
                        id: videoId,
                        title: item.snippet.title,
                        description: item.snippet.description,
                        channelId: item.snippet.channelId,
                        channelTitle: videoDetails?.snippet?.channelTitle,
                        publishedAt: item.snippet.publishedAt,
                        playlistItemId: item.id,
                        position: item.snippet.position,
                        thumbnails: item.snippet.thumbnails,
                        tags: videoDetails?.snippet?.tags,
                        categoryId: videoDetails?.snippet?.categoryId,
                        statistics: videoDetails?.statistics
                            ? {
                                  viewCount: videoDetails.statistics.viewCount,
                                  likeCount: videoDetails.statistics.likeCount,
                                  commentCount: videoDetails.statistics.commentCount
                              }
                            : undefined,
                        status: videoDetails?.status
                            ? {
                                  privacyStatus: videoDetails.status.privacyStatus,
                                  uploadStatus: videoDetails.status.uploadStatus,
                                  license: videoDetails.status.license,
                                  embeddable: videoDetails.status.embeddable
                              }
                            : undefined
                    };
                });

                if (uploadedVideos.length > 0) {
                    await nango.batchSave(uploadedVideos, 'UploadedVideo');
                }

                // Save checkpoint for pagination resume
                if (nextPageToken) {
                    await nango.saveCheckpoint({
                        uploads_playlist_id: uploadsPlaylistId,
                        uploads_playlist_index: uploadsPlaylistIndex,
                        page_token: nextPageToken
                    });
                    pageToken = nextPageToken;
                    continue;
                }

                const nextUploadsPlaylistId = uploadsPlaylistIds[uploadsPlaylistIndex + 1];
                if (nextUploadsPlaylistId) {
                    await nango.saveCheckpoint({
                        uploads_playlist_id: nextUploadsPlaylistId,
                        uploads_playlist_index: uploadsPlaylistIndex + 1,
                        page_token: ''
                    });
                }

                break;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('UploadedVideo');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
