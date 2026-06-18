import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    channelId: z.string().describe('The YouTube channel ID. Example: "UC_x5XG1OV2P6uZZ5FSM9Ttw"'),
    maxResults: z.number().optional().describe('Maximum number of playlists to return (1-50). Default: 5'),
    pageToken: z.string().optional().describe('Pagination token for the next page of results')
});

const ThumbnailSchema = z.object({
    url: z.string(),
    width: z.number().optional(),
    height: z.number().optional()
});

const ThumbnailsRecordSchema = z.record(z.string(), ThumbnailSchema);

const SnippetSchema = z.object({
    publishedAt: z.string(),
    channelId: z.string(),
    title: z.string(),
    description: z.string(),
    thumbnails: ThumbnailsRecordSchema,
    channelTitle: z.string(),
    localized: z
        .object({
            title: z.string(),
            description: z.string()
        })
        .optional()
});

const ContentDetailsSchema = z.object({
    itemCount: z.number()
});

const StatusSchema = z.object({
    privacyStatus: z.string()
});

const PlaylistSchema = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    snippet: SnippetSchema.optional(),
    contentDetails: ContentDetailsSchema.optional(),
    status: StatusSchema.optional()
});

const PageInfoSchema = z.object({
    totalResults: z.number(),
    resultsPerPage: z.number()
});

const ProviderResponseSchema = z.object({
    kind: z.string(),
    etag: z.string(),
    nextPageToken: z.string().optional(),
    prevPageToken: z.string().optional(),
    pageInfo: PageInfoSchema,
    items: z.array(PlaylistSchema)
});

const PlaylistOutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    channelId: z.string().optional(),
    channelTitle: z.string().optional(),
    publishedAt: z.string().optional(),
    privacyStatus: z.string().optional(),
    itemCount: z.number().optional(),
    thumbnails: ThumbnailsRecordSchema.optional()
});

const OutputSchema = z.object({
    playlists: z.array(PlaylistOutputSchema),
    nextPageToken: z.string().optional(),
    prevPageToken: z.string().optional(),
    totalResults: z.number()
});

const action = createAction({
    description: 'List playlists for a YouTube channel',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/playlists/list
        const response = await nango.get({
            endpoint: '/youtube/v3/playlists',
            params: {
                channelId: input.channelId,
                part: 'snippet,contentDetails,status',
                ...(input.maxResults && { maxResults: String(input.maxResults) }),
                ...(input.pageToken && { pageToken: input.pageToken })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            playlists: providerData.items.map((playlist) => ({
                id: playlist.id,
                ...(playlist.snippet?.title != null && { title: playlist.snippet.title }),
                ...(playlist.snippet?.description != null && { description: playlist.snippet.description }),
                ...(playlist.snippet?.channelId != null && { channelId: playlist.snippet.channelId }),
                ...(playlist.snippet?.channelTitle != null && { channelTitle: playlist.snippet.channelTitle }),
                ...(playlist.snippet?.publishedAt != null && { publishedAt: playlist.snippet.publishedAt }),
                ...(playlist.status?.privacyStatus != null && { privacyStatus: playlist.status.privacyStatus }),
                ...(playlist.contentDetails?.itemCount != null && { itemCount: playlist.contentDetails.itemCount }),
                ...(playlist.snippet?.thumbnails != null && { thumbnails: playlist.snippet.thumbnails })
            })),
            ...(providerData.nextPageToken != null && { nextPageToken: providerData.nextPageToken }),
            ...(providerData.prevPageToken != null && { prevPageToken: providerData.prevPageToken }),
            totalResults: providerData.pageInfo.totalResults
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
