import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file containing the comment. Example: "1abc123xyz"'),
    comment_id: z.string().describe('The ID of the comment to retrieve. Example: "AAAB1p01B9w"')
});

const OutputSchema = z.object({
    id: z.string(),
    content: z.string(),
    htmlContent: z.string(),
    createdTime: z.string(),
    modifiedTime: z.string(),
    deleted: z.boolean(),
    resolved: z.boolean().optional(),
    author: z.object({
        displayName: z.string(),
        photoLink: z.union([z.string(), z.null()]),
        me: z.boolean()
    }),
    replies: z.array(
        z.object({
            id: z.string(),
            content: z.string(),
            author: z.object({
                displayName: z.string(),
                me: z.boolean()
            }),
            createdTime: z.string()
        })
    )
});

const action = createAction({
    description: 'Get a comment by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-comment',
        group: 'Comments'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/comments/get
        const response = await nango.get({
            endpoint: `/drive/v3/files/${input.file_id}/comments/${input.comment_id}`,
            params: {
                fields: '*'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found',
                file_id: input.file_id,
                comment_id: input.comment_id
            });
        }

        const comment = response.data;

        return {
            id: comment.id,
            content: comment.content,
            htmlContent: comment.htmlContent,
            createdTime: comment.createdTime,
            modifiedTime: comment.modifiedTime,
            deleted: comment.deleted,
            resolved: comment.resolved,
            author: {
                displayName: comment.author?.displayName || '',
                photoLink: comment.author?.photoLink || null,
                me: comment.author?.me || false
            },
            replies: (comment.replies || []).map((reply: any) => ({
                id: reply.id,
                content: reply.content,
                author: {
                    displayName: reply.author?.displayName || '',
                    me: reply.author?.me || false
                },
                createdTime: reply.createdTime
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
