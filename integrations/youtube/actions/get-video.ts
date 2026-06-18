import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    videoId: z.string().describe('YouTube video ID. Example: "dQw4w9WgXcQ"')
});

const SnippetSchema = z.object({
    publishedAt: z.string().optional(),
    channelId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    thumbnails: z.any().optional(),
    channelTitle: z.string().optional(),
    tags: z.array(z.string()).optional(),
    categoryId: z.string().optional(),
    liveBroadcastContent: z.string().optional(),
    localized: z.any().optional()
});

const ContentDetailsSchema = z.object({
    duration: z.string().optional(),
    dimension: z.string().optional(),
    definition: z.string().optional(),
    caption: z.string().optional(),
    licensedContent: z.boolean().optional(),
    contentRating: z.any().optional(),
    projection: z.string().optional()
});

const StatisticsSchema = z.object({
    viewCount: z.string().optional(),
    likeCount: z.string().optional(),
    dislikeCount: z.string().optional(),
    favoriteCount: z.string().optional(),
    commentCount: z.string().optional()
});

const StatusSchema = z.object({
    uploadStatus: z.string().optional(),
    failureReason: z.string().optional(),
    rejectionReason: z.string().optional(),
    privacyStatus: z.string().optional(),
    publishAt: z.string().optional(),
    license: z.string().optional(),
    embeddable: z.boolean().optional(),
    publicStatsViewable: z.boolean().optional(),
    madeForKids: z.boolean().optional(),
    selfDeclaredMadeForKids: z.boolean().optional()
});

const ProviderVideoSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    snippet: SnippetSchema.optional(),
    contentDetails: ContentDetailsSchema.optional(),
    statistics: StatisticsSchema.optional(),
    status: StatusSchema.optional()
});

const ProviderResponseSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    pageInfo: z.any().optional(),
    items: z.array(ProviderVideoSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    publishedAt: z.string().optional(),
    channelId: z.string().optional(),
    channelTitle: z.string().optional(),
    duration: z.string().optional(),
    viewCount: z.string().optional(),
    likeCount: z.string().optional(),
    commentCount: z.string().optional(),
    privacyStatus: z.string().optional(),
    thumbnails: z.any().optional(),
    tags: z.array(z.string()).optional(),
    categoryId: z.string().optional(),
    definition: z.string().optional(),
    caption: z.string().optional(),
    embeddable: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a YouTube video by video ID',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/videos/list
        const response = await nango.get({
            endpoint: '/youtube/v3/videos',
            params: {
                id: input.videoId,
                part: 'snippet,contentDetails,statistics,status'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.items || providerResponse.items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Video not found',
                videoId: input.videoId
            });
        }

        const video = providerResponse.items[0];

        if (!video) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Video not found',
                videoId: input.videoId
            });
        }

        return {
            id: video.id,
            ...(video.snippet?.title != null && { title: video.snippet.title }),
            ...(video.snippet?.description != null && {
                description: video.snippet.description
            }),
            ...(video.snippet?.publishedAt != null && {
                publishedAt: video.snippet.publishedAt
            }),
            ...(video.snippet?.channelId != null && {
                channelId: video.snippet.channelId
            }),
            ...(video.snippet?.channelTitle != null && {
                channelTitle: video.snippet.channelTitle
            }),
            ...(video.contentDetails?.duration != null && {
                duration: video.contentDetails.duration
            }),
            ...(video.statistics?.viewCount != null && {
                viewCount: video.statistics.viewCount
            }),
            ...(video.statistics?.likeCount != null && {
                likeCount: video.statistics.likeCount
            }),
            ...(video.statistics?.commentCount != null && {
                commentCount: video.statistics.commentCount
            }),
            ...(video.status?.privacyStatus != null && {
                privacyStatus: video.status.privacyStatus
            }),
            ...(video.snippet?.thumbnails != null && {
                thumbnails: video.snippet.thumbnails
            }),
            ...(video.snippet?.tags != null && { tags: video.snippet.tags }),
            ...(video.snippet?.categoryId != null && {
                categoryId: video.snippet.categoryId
            }),
            ...(video.contentDetails?.definition != null && {
                definition: video.contentDetails.definition
            }),
            ...(video.contentDetails?.caption != null && {
                caption: video.contentDetails.caption
            }),
            ...(video.status?.embeddable != null && {
                embeddable: video.status.embeddable
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
