import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    videoId: z.string().optional().describe('The video ID to retrieve comment threads for. Example: "dQw4w9WgXcQ"'),
    allThreadsRelatedToChannelId: z.string().optional().describe('The channel ID to retrieve all comment threads for.'),
    pageToken: z.string().optional().describe('The token for the next page of results.'),
    maxResults: z.number().min(1).max(100).optional().describe('Maximum number of results to return (1-100). Default: 20.'),
    order: z.enum(['time', 'relevance']).optional().describe('Order of comment threads. time (default) or relevance.'),
    searchTerms: z.string().optional().describe('Search terms to filter comments.'),
    textFormat: z.enum(['html', 'plainText']).optional().describe('Format of comments. html (default) or plainText.')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    snippet: z
        .object({
            videoId: z.string().optional(),
            channelId: z.string().optional(),
            topLevelComment: z
                .object({
                    id: z.string(),
                    snippet: z
                        .object({
                            videoId: z.string().optional(),
                            channelId: z.string().optional(),
                            authorDisplayName: z.string().optional(),
                            authorProfileImageUrl: z.string().optional(),
                            authorChannelUrl: z.string().optional(),
                            authorChannelId: z.object({ value: z.string() }).optional(),
                            textDisplay: z.string().optional(),
                            textOriginal: z.string().optional(),
                            parentId: z.string().optional(),
                            canRate: z.boolean().optional(),
                            viewerRating: z.string().optional(),
                            likeCount: z.number().optional(),
                            moderationStatus: z.string().optional(),
                            publishedAt: z.string().optional(),
                            updatedAt: z.string().optional()
                        })
                        .optional()
                })
                .optional(),
            canReply: z.boolean().optional(),
            totalReplyCount: z.number().optional(),
            isPublic: z.boolean().optional()
        })
        .optional(),
    replies: z
        .object({
            comments: z
                .array(
                    z.object({
                        id: z.string(),
                        snippet: z
                            .object({
                                videoId: z.string().optional(),
                                channelId: z.string().optional(),
                                authorDisplayName: z.string().optional(),
                                authorProfileImageUrl: z.string().optional(),
                                authorChannelUrl: z.string().optional(),
                                authorChannelId: z.object({ value: z.string() }).optional(),
                                textDisplay: z.string().optional(),
                                textOriginal: z.string().optional(),
                                parentId: z.string().optional(),
                                canRate: z.boolean().optional(),
                                viewerRating: z.string().optional(),
                                likeCount: z.number().optional(),
                                moderationStatus: z.string().optional(),
                                publishedAt: z.string().optional(),
                                updatedAt: z.string().optional()
                            })
                            .optional()
                    })
                )
                .optional()
        })
        .optional()
});

const CommentOutputSchema = z.object({
    id: z.string(),
    videoId: z.string().optional(),
    channelId: z.string().optional(),
    topLevelCommentId: z.string().optional(),
    topLevelCommentAuthor: z.string().optional(),
    topLevelCommentText: z.string().optional(),
    topLevelCommentPublishedAt: z.string().optional(),
    topLevelCommentLikeCount: z.number().optional(),
    totalReplyCount: z.number().optional(),
    canReply: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    replies: z
        .array(
            z.object({
                id: z.string(),
                author: z.string().optional(),
                text: z.string().optional(),
                publishedAt: z.string().optional(),
                likeCount: z.number().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    items: z.array(CommentOutputSchema),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'List YouTube comment threads for a video or channel.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Validate that exactly one of videoId or allThreadsRelatedToChannelId is provided
        if (!input.videoId && !input.allThreadsRelatedToChannelId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either videoId or allThreadsRelatedToChannelId must be provided.'
            });
        }
        if (input.videoId && input.allThreadsRelatedToChannelId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Only one of videoId or allThreadsRelatedToChannelId can be provided, not both.'
            });
        }

        // https://developers.google.com/youtube/v3/docs/commentThreads/list
        const response = await nango.get({
            endpoint: '/youtube/v3/commentThreads',
            params: {
                part: 'snippet,replies',
                ...(input.videoId && { videoId: input.videoId }),
                ...(input.allThreadsRelatedToChannelId && { allThreadsRelatedToChannelId: input.allThreadsRelatedToChannelId }),
                ...(input.pageToken && { pageToken: input.pageToken }),
                ...(input.maxResults && { maxResults: String(input.maxResults) }),
                ...(input.order && { order: input.order }),
                ...(input.searchTerms && { searchTerms: input.searchTerms }),
                ...(input.textFormat && { textFormat: input.textFormat })
            },
            retries: 3
        });

        const ResponseSchema = z.object({
            items: z.array(z.unknown()).optional(),
            nextPageToken: z.string().optional()
        });

        const responseData = ResponseSchema.parse(response.data);

        if (!responseData.items || responseData.items.length === 0) {
            return {
                items: [],
                ...(responseData.nextPageToken && { nextPageToken: responseData.nextPageToken })
            };
        }

        const items = responseData.items.map((item: unknown) => {
            const parsed = ProviderCommentSchema.parse(item);
            const snippet = parsed.snippet;
            const topLevelComment = snippet?.topLevelComment;
            const topLevelSnippet = topLevelComment?.snippet;
            const replies = parsed.replies?.comments;

            return {
                id: parsed.id,
                ...(snippet?.videoId && { videoId: snippet.videoId }),
                ...(snippet?.channelId && { channelId: snippet.channelId }),
                ...(topLevelComment?.id && { topLevelCommentId: topLevelComment.id }),
                ...(topLevelSnippet?.authorDisplayName && { topLevelCommentAuthor: topLevelSnippet.authorDisplayName }),
                ...(topLevelSnippet?.textDisplay && { topLevelCommentText: topLevelSnippet.textDisplay }),
                ...(topLevelSnippet?.publishedAt && { topLevelCommentPublishedAt: topLevelSnippet.publishedAt }),
                ...(topLevelSnippet?.likeCount !== undefined && { topLevelCommentLikeCount: topLevelSnippet.likeCount }),
                ...(snippet?.totalReplyCount !== undefined && { totalReplyCount: snippet.totalReplyCount }),
                ...(snippet?.canReply !== undefined && { canReply: snippet.canReply }),
                ...(snippet?.isPublic !== undefined && { isPublic: snippet.isPublic }),
                ...(replies &&
                    replies.length > 0 && {
                        replies: replies.map((reply) => ({
                            id: reply.id,
                            ...(reply.snippet?.authorDisplayName && { author: reply.snippet.authorDisplayName }),
                            ...(reply.snippet?.textDisplay && { text: reply.snippet.textDisplay }),
                            ...(reply.snippet?.publishedAt && { publishedAt: reply.snippet.publishedAt }),
                            ...(reply.snippet?.likeCount !== undefined && { likeCount: reply.snippet.likeCount })
                        }))
                    })
            };
        });

        return {
            items,
            ...(responseData.nextPageToken && { nextPageToken: responseData.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
