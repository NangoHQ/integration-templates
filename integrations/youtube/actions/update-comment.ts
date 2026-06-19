import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the comment to update. Example: "UgzDE2pQ6kCHY1EaXcJ4AaABAg"'),
    textOriginal: z.string().describe('The new text content for the comment.')
});

const ProviderCommentSchema = z.object({
    id: z.string(),
    snippet: z.object({
        authorDisplayName: z.string(),
        authorProfileImageUrl: z.string().optional(),
        authorChannelUrl: z.string().optional(),
        authorChannelId: z
            .object({
                value: z.string()
            })
            .optional(),
        channelId: z.string().optional(),
        videoId: z.string().optional(),
        textDisplay: z.string(),
        textOriginal: z.string(),
        parentId: z.string().optional(),
        canRate: z.boolean().optional(),
        viewerRating: z.string().optional(),
        likeCount: z.number().optional(),
        moderationStatus: z.string().optional(),
        publishedAt: z.string(),
        updatedAt: z.string()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    authorDisplayName: z.string(),
    authorChannelId: z.string().optional(),
    textDisplay: z.string(),
    textOriginal: z.string(),
    likeCount: z.number().optional(),
    publishedAt: z.string(),
    updatedAt: z.string(),
    videoId: z.string().optional(),
    parentId: z.string().optional(),
    channelId: z.string().optional()
});

const action = createAction({
    description: 'Update the text of a YouTube comment.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/comments/update
        const response = await nango.put({
            endpoint: '/youtube/v3/comments',
            params: {
                part: 'snippet'
            },
            data: {
                id: input.id,
                snippet: {
                    textOriginal: input.textOriginal
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found or could not be updated',
                commentId: input.id
            });
        }

        const providerComment = ProviderCommentSchema.parse(response.data);

        return {
            id: providerComment.id,
            authorDisplayName: providerComment.snippet.authorDisplayName,
            ...(providerComment.snippet.authorChannelId?.value && {
                authorChannelId: providerComment.snippet.authorChannelId.value
            }),
            textDisplay: providerComment.snippet.textDisplay,
            textOriginal: providerComment.snippet.textOriginal,
            ...(providerComment.snippet.likeCount !== undefined && {
                likeCount: providerComment.snippet.likeCount
            }),
            publishedAt: providerComment.snippet.publishedAt,
            updatedAt: providerComment.snippet.updatedAt,
            ...(providerComment.snippet.videoId && { videoId: providerComment.snippet.videoId }),
            ...(providerComment.snippet.parentId && { parentId: providerComment.snippet.parentId }),
            ...(providerComment.snippet.channelId && { channelId: providerComment.snippet.channelId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
