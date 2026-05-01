import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parentId: z.string().describe('The ID of the parent comment to reply to. Example: "UgyYYtDkvwfR2g4Y8HZ4AaABAg"'),
    textOriginal: z.string().describe('The original text of the reply. Example: "Thanks for watching!"')
});

const ProviderSnippetSchema = z.object({
    parentId: z.string().optional(),
    textOriginal: z.string().optional(),
    authorDisplayName: z.string().optional(),
    authorProfileImageUrl: z.string().optional(),
    authorChannelUrl: z.string().optional(),
    authorChannelId: z.object({ value: z.string().optional() }).optional(),
    videoId: z.string().optional(),
    likeCount: z.number().optional(),
    publishedAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const ProviderCommentSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    snippet: ProviderSnippetSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    parentId: z.string().optional(),
    textOriginal: z.string().optional(),
    authorDisplayName: z.string().optional(),
    authorProfileImageUrl: z.string().optional(),
    authorChannelUrl: z.string().optional(),
    authorChannelId: z.string().optional(),
    videoId: z.string().optional(),
    likeCount: z.number().optional(),
    publishedAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Reply to an existing YouTube comment',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-comment-reply',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/comments/insert
        const response = await nango.post({
            endpoint: '/youtube/v3/comments',
            params: {
                part: 'snippet'
            },
            data: {
                snippet: {
                    parentId: input.parentId,
                    textOriginal: input.textOriginal
                }
            },
            retries: 10
        });

        const comment = ProviderCommentSchema.parse(response.data);
        const snippet = comment.snippet;

        return {
            id: comment.id,
            ...(snippet?.parentId !== undefined && { parentId: snippet.parentId }),
            ...(snippet?.textOriginal !== undefined && { textOriginal: snippet.textOriginal }),
            ...(snippet?.authorDisplayName !== undefined && { authorDisplayName: snippet.authorDisplayName }),
            ...(snippet?.authorProfileImageUrl !== undefined && { authorProfileImageUrl: snippet.authorProfileImageUrl }),
            ...(snippet?.authorChannelUrl !== undefined && { authorChannelUrl: snippet.authorChannelUrl }),
            ...(snippet?.authorChannelId?.value !== undefined && { authorChannelId: snippet.authorChannelId.value }),
            ...(snippet?.videoId !== undefined && { videoId: snippet.videoId }),
            ...(snippet?.likeCount !== undefined && { likeCount: snippet.likeCount }),
            ...(snippet?.publishedAt !== undefined && { publishedAt: snippet.publishedAt }),
            ...(snippet?.updatedAt !== undefined && { updatedAt: snippet.updatedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
