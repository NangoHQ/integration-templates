import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    videoId: z.string().describe('The ID of the video to comment on. Example: "dQw4w9WgXcQ"'),
    channelId: z.string().describe('The ID of the channel that owns the video. Example: "UC_x5XG1OV2P6uZZ5FSM9Ttw"'),
    text: z.string().describe('The text content of the comment. Example: "Great video!"').min(1, 'Comment text cannot be empty')
});

const CommentSnippetSchema = z.object({
    videoId: z.string(),
    textDisplay: z.string(),
    textOriginal: z.string(),
    authorDisplayName: z.string(),
    authorProfileImageUrl: z.string().optional(),
    authorChannelUrl: z.string().optional(),
    authorChannelId: z.object({ value: z.string() }).optional(),
    canRate: z.boolean().optional(),
    viewerRating: z.string().optional(),
    likeCount: z.number().optional(),
    publishedAt: z.string(),
    updatedAt: z.string()
});

const TopLevelCommentSchema = z.object({
    id: z.string(),
    snippet: CommentSnippetSchema
});

const CommentThreadSnippetSchema = z.object({
    channelId: z.string(),
    videoId: z.string(),
    topLevelComment: TopLevelCommentSchema,
    canReply: z.boolean().optional(),
    totalReplyCount: z.number().optional(),
    isPublic: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    snippet: CommentThreadSnippetSchema
});

const OutputSchema = z.object({
    commentThreadId: z.string(),
    commentId: z.string(),
    channelId: z.string(),
    videoId: z.string(),
    textDisplay: z.string(),
    textOriginal: z.string(),
    authorDisplayName: z.string(),
    authorChannelId: z.string().optional(),
    publishedAt: z.string(),
    updatedAt: z.string(),
    likeCount: z.number().optional(),
    canReply: z.boolean().optional(),
    totalReplyCount: z.number().optional(),
    isPublic: z.boolean().optional()
});

const action = createAction({
    description: 'Create a top-level comment on a YouTube video or channel thread.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/youtube.force-ssl'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/youtube/v3/docs/commentThreads/insert
        const response = await nango.post({
            endpoint: '/youtube/v3/commentThreads',
            params: {
                part: 'snippet'
            },
            data: {
                snippet: {
                    channelId: input.channelId,
                    videoId: input.videoId,
                    topLevelComment: {
                        snippet: {
                            textOriginal: input.text
                        }
                    }
                }
            },
            retries: 10
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            commentThreadId: providerData.id,
            commentId: providerData.snippet.topLevelComment.id,
            channelId: providerData.snippet.channelId,
            videoId: providerData.snippet.videoId,
            textDisplay: providerData.snippet.topLevelComment.snippet.textDisplay,
            textOriginal: providerData.snippet.topLevelComment.snippet.textOriginal,
            authorDisplayName: providerData.snippet.topLevelComment.snippet.authorDisplayName,
            authorChannelId: providerData.snippet.topLevelComment.snippet.authorChannelId?.value,
            publishedAt: providerData.snippet.topLevelComment.snippet.publishedAt,
            updatedAt: providerData.snippet.topLevelComment.snippet.updatedAt,
            likeCount: providerData.snippet.topLevelComment.snippet.likeCount,
            canReply: providerData.snippet.canReply,
            totalReplyCount: providerData.snippet.totalReplyCount,
            isPublic: providerData.snippet.isPublic
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
