import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().describe('The ID of the comment to retrieve. Example: "UgxT9K7pHq8QfC2z3t4"')
});

const ProviderCommentListResponseSchema = z.object({
    items: z.array(z.unknown()).optional()
});

const ProviderCommentSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    snippet: z
        .object({
            authorDisplayName: z.string().optional(),
            authorProfileImageUrl: z.string().optional(),
            authorChannelUrl: z.string().optional(),
            authorChannelId: z
                .object({
                    value: z.string()
                })
                .optional(),
            channelId: z.string().optional(),
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
});

const OutputSchema = z.object({
    id: z.string(),
    authorDisplayName: z.string().optional(),
    authorProfileImageUrl: z.string().optional(),
    authorChannelUrl: z.string().optional(),
    authorChannelId: z.string().optional(),
    channelId: z.string().optional(),
    textDisplay: z.string().optional(),
    textOriginal: z.string().optional(),
    parentId: z.string().optional(),
    canRate: z.boolean().optional(),
    viewerRating: z.string().optional(),
    likeCount: z.number().optional(),
    moderationStatus: z.string().optional(),
    publishedAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a YouTube comment by comment ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/comments/list
        const response = await nango.get({
            endpoint: '/youtube/v3/comments',
            params: {
                id: input.commentId,
                part: 'id,snippet'
            },
            retries: 3
        });

        const data = ProviderCommentListResponseSchema.parse(response.data);

        if (!data.items || data.items.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found',
                commentId: input.commentId
            });
        }

        const providerComment = ProviderCommentSchema.parse(data.items[0]);

        return {
            id: providerComment.id,
            ...(providerComment.snippet?.authorDisplayName !== undefined && {
                authorDisplayName: providerComment.snippet.authorDisplayName
            }),
            ...(providerComment.snippet?.authorProfileImageUrl !== undefined && {
                authorProfileImageUrl: providerComment.snippet.authorProfileImageUrl
            }),
            ...(providerComment.snippet?.authorChannelUrl !== undefined && {
                authorChannelUrl: providerComment.snippet.authorChannelUrl
            }),
            ...(providerComment.snippet?.authorChannelId?.value !== undefined && {
                authorChannelId: providerComment.snippet.authorChannelId.value
            }),
            ...(providerComment.snippet?.channelId !== undefined && {
                channelId: providerComment.snippet.channelId
            }),
            ...(providerComment.snippet?.textDisplay !== undefined && {
                textDisplay: providerComment.snippet.textDisplay
            }),
            ...(providerComment.snippet?.textOriginal !== undefined && {
                textOriginal: providerComment.snippet.textOriginal
            }),
            ...(providerComment.snippet?.parentId !== undefined && {
                parentId: providerComment.snippet.parentId
            }),
            ...(providerComment.snippet?.canRate !== undefined && {
                canRate: providerComment.snippet.canRate
            }),
            ...(providerComment.snippet?.viewerRating !== undefined && {
                viewerRating: providerComment.snippet.viewerRating
            }),
            ...(providerComment.snippet?.likeCount !== undefined && {
                likeCount: providerComment.snippet.likeCount
            }),
            ...(providerComment.snippet?.moderationStatus !== undefined && {
                moderationStatus: providerComment.snippet.moderationStatus
            }),
            ...(providerComment.snippet?.publishedAt !== undefined && {
                publishedAt: providerComment.snippet.publishedAt
            }),
            ...(providerComment.snippet?.updatedAt !== undefined && {
                updatedAt: providerComment.snippet.updatedAt
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
