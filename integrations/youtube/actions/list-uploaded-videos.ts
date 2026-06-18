import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channel_id: z
        .string()
        .optional()
        .describe('YouTube channel ID. If omitted, uses the authenticated user\'s channel ("mine"). Example: "UC_x5XG1OV2P6uZZ5FSM9Ttw"'),
    cursor: z.string().optional().describe('Page token from a previous response next_cursor to fetch the next page of results.')
});

const VideoSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    published_at: z.string(),
    channel_id: z.string(),
    channel_title: z.string().optional(),
    video_id: z.string(),
    thumbnail_url: z.string().optional(),
    position: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(VideoSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List uploaded videos for a channel using its uploads playlist.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Step 1: Get the uploads playlist ID from the channel
        // https://developers.google.com/youtube/v3/docs/channels/list
        const channelResponse = await nango.get({
            endpoint: '/youtube/v3/channels',
            params: {
                part: 'contentDetails',
                ...(input.channel_id ? { id: input.channel_id } : { mine: 'true' })
            },
            retries: 3
        });

        const channels = channelResponse.data?.items;
        if (!channels || channels.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Channel not found'
            });
        }

        const uploadsPlaylistId = channels[0].contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsPlaylistId) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Uploads playlist not found for this channel'
            });
        }

        // Step 2: Get the playlist items (uploaded videos)
        // https://developers.google.com/youtube/v3/docs/playlistItems/list
        const playlistResponse = await nango.get({
            endpoint: '/youtube/v3/playlistItems',
            params: {
                part: 'snippet,contentDetails',
                playlistId: uploadsPlaylistId,
                maxResults: '50',
                ...(input.cursor && { pageToken: input.cursor })
            },
            retries: 3
        });

        const items = playlistResponse.data?.items || [];
        const nextPageToken = playlistResponse.data?.nextPageToken;

        // Map the response to our output schema
        const videos = items.map(
            (item: {
                snippet?: {
                    title?: string;
                    description?: string;
                    publishedAt?: string;
                    channelId?: string;
                    channelTitle?: string;
                    position?: number;
                    thumbnails?: {
                        default?: { url?: string };
                        medium?: { url?: string };
                        high?: { url?: string };
                    };
                };
                contentDetails?: {
                    videoId?: string;
                };
            }) => {
                const snippet = item.snippet || {};
                const thumbnails = snippet.thumbnails || {};
                const thumbnailUrl = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;

                return {
                    id: item.contentDetails?.videoId || '',
                    video_id: item.contentDetails?.videoId || '',
                    title: snippet.title || '',
                    description: snippet.description,
                    published_at: snippet.publishedAt || '',
                    channel_id: snippet.channelId || '',
                    channel_title: snippet.channelTitle,
                    position: snippet.position,
                    ...(thumbnailUrl && { thumbnail_url: thumbnailUrl })
                };
            }
        );

        return {
            items: videos,
            ...(nextPageToken && { next_cursor: nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
