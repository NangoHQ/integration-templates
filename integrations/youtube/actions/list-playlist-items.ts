import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    playlistId: z.string().describe('The ID of the YouTube playlist to list items from. Example: "PLBCF2DAC6FFB574DE"'),
    maxResults: z.number().optional().describe('The maximum number of items to return (1-50, default 50).'),
    cursor: z.string().optional().describe('Pagination token from the previous response. Omit for the first page.')
});

const ProviderContentDetailsSchema = z.object({
    videoId: z.string().optional(),
    videoPublishedAt: z.string().optional()
});

const ProviderSnippetThumbnailsSchema = z.object({
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
});

const ProviderSnippetSchema = z.object({
    publishedAt: z.string().optional(),
    channelId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    thumbnails: z.record(z.string(), ProviderSnippetThumbnailsSchema).optional(),
    channelTitle: z.string().optional(),
    playlistId: z.string().optional(),
    position: z.number().optional(),
    resourceId: z
        .object({
            kind: z.string().optional(),
            videoId: z.string().optional()
        })
        .optional(),
    videoOwnerChannelId: z.string().optional(),
    videoOwnerChannelTitle: z.string().optional()
});

const ProviderStatusSchema = z.object({
    privacyStatus: z.string().optional()
});

const ProviderPlaylistItemSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    snippet: ProviderSnippetSchema.optional(),
    contentDetails: ProviderContentDetailsSchema.optional(),
    status: ProviderStatusSchema.optional()
});

const ProviderListResponseSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    nextPageToken: z.string().optional(),
    prevPageToken: z.string().optional(),
    pageInfo: z
        .object({
            totalResults: z.number().optional(),
            resultsPerPage: z.number().optional()
        })
        .optional(),
    items: z.array(ProviderPlaylistItemSchema)
});

const PlaylistItemSchema = z.object({
    id: z.string().describe('The unique ID of the playlist item.'),
    playlistId: z.string().optional().describe('The ID of the playlist this item belongs to.'),
    videoId: z.string().optional().describe('The ID of the video in this playlist item.'),
    position: z.number().optional().describe('The position of the item in the playlist (0-indexed).'),
    title: z.string().optional().describe('The title of the video.'),
    description: z.string().optional().describe('The description of the video.'),
    publishedAt: z.string().optional().describe('The date and time the item was added to the playlist.'),
    channelId: z.string().optional().describe('The ID of the channel that owns the playlist.'),
    channelTitle: z.string().optional().describe('The title of the channel that owns the playlist.'),
    videoOwnerChannelId: z.string().optional().describe('The ID of the channel that uploaded the video.'),
    videoOwnerChannelTitle: z.string().optional().describe('The title of the channel that uploaded the video.'),
    privacyStatus: z.string().optional().describe('The privacy status of the video (public, unlisted, private).'),
    videoPublishedAt: z.string().optional().describe('The date and time the video was published.'),
    thumbnails: z
        .record(
            z.string(),
            z.object({
                url: z.string().optional(),
                width: z.number().optional(),
                height: z.number().optional()
            })
        )
        .optional()
        .describe('Thumbnail images for the video.')
});

const OutputSchema = z.object({
    items: z.array(PlaylistItemSchema).describe('The playlist items returned.'),
    nextCursor: z.string().optional().describe('Token for the next page of results. Omit if no more results.'),
    totalResults: z.number().optional().describe('Total number of results available.'),
    resultsPerPage: z.number().optional().describe('Number of results returned per page.')
});

const action = createAction({
    description: 'List items in a YouTube playlist',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-playlist-items',
        group: 'Playlists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            playlistId: input.playlistId,
            part: 'snippet,contentDetails,status'
        };

        if (input.maxResults !== undefined) {
            params['maxResults'] = input.maxResults;
        }

        if (input.cursor) {
            params['pageToken'] = input.cursor;
        }

        // https://developers.google.com/youtube/v3/docs/playlistItems/list
        const response = await nango.get({
            endpoint: '/youtube/v3/playlistItems',
            params: params,
            retries: 3
        });

        const providerData = ProviderListResponseSchema.parse(response.data);

        const items = providerData.items.map((item) => {
            const output: z.infer<typeof PlaylistItemSchema> = {
                id: item.id
            };

            if (item.snippet) {
                if (item.snippet.playlistId !== undefined) {
                    output.playlistId = item.snippet.playlistId;
                }
                if (item.snippet.position !== undefined) {
                    output.position = item.snippet.position;
                }
                if (item.snippet.title !== undefined) {
                    output.title = item.snippet.title;
                }
                if (item.snippet.description !== undefined) {
                    output.description = item.snippet.description;
                }
                if (item.snippet.publishedAt !== undefined) {
                    output.publishedAt = item.snippet.publishedAt;
                }
                if (item.snippet.channelId !== undefined) {
                    output.channelId = item.snippet.channelId;
                }
                if (item.snippet.channelTitle !== undefined) {
                    output.channelTitle = item.snippet.channelTitle;
                }
                if (item.snippet.videoOwnerChannelId !== undefined) {
                    output.videoOwnerChannelId = item.snippet.videoOwnerChannelId;
                }
                if (item.snippet.videoOwnerChannelTitle !== undefined) {
                    output.videoOwnerChannelTitle = item.snippet.videoOwnerChannelTitle;
                }
                if (item.snippet.thumbnails !== undefined) {
                    output.thumbnails = item.snippet.thumbnails;
                }

                if (item.snippet.resourceId && item.snippet.resourceId.videoId) {
                    output.videoId = item.snippet.resourceId.videoId;
                }
            }

            if (item.contentDetails) {
                if (item.contentDetails.videoId !== undefined) {
                    output.videoId = item.contentDetails.videoId;
                }
                if (item.contentDetails.videoPublishedAt !== undefined) {
                    output.videoPublishedAt = item.contentDetails.videoPublishedAt;
                }
            }

            if (item.status && item.status.privacyStatus !== undefined) {
                output.privacyStatus = item.status.privacyStatus;
            }

            return output;
        });

        const result: z.infer<typeof OutputSchema> = {
            items: items
        };

        if (providerData.nextPageToken !== undefined) {
            result.nextCursor = providerData.nextPageToken;
        }

        if (providerData.pageInfo) {
            if (providerData.pageInfo.totalResults !== undefined) {
                result.totalResults = providerData.pageInfo.totalResults;
            }
            if (providerData.pageInfo.resultsPerPage !== undefined) {
                result.resultsPerPage = providerData.pageInfo.resultsPerPage;
            }
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
