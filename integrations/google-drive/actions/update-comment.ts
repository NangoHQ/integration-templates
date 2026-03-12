import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file containing the comment. Example: "1mlzflxHXQkoCj-3p1T_O762TNAfGGr_iIb5C9uwnIwk"'),
    comment_id: z.string().describe('The ID of the comment to update. Example: "AAAB1pvq854"'),
    content: z.string().describe('The new plain text content of the comment. Example: "Updated comment text"'),
    resolved: z.boolean().optional().describe('Whether the comment is resolved. Optional.')
});

const OutputSchema = z.object({
    id: z.string(),
    content: z.string(),
    htmlContent: z.string(),
    createdTime: z.string(),
    modifiedTime: z.string(),
    author: z.object({
        displayName: z.string(),
        kind: z.string(),
        me: z.boolean(),
        photoLink: z.string().optional()
    }),
    deleted: z.boolean(),
    resolved: z.boolean().optional(),
    replies: z.array(z.object({})).optional()
});

const action = createAction({
    description: 'Update a comment on a file',
    version: '1.0.0',

    endpoint: {
        method: 'PATCH',
        path: '/actions/update-comment',
        group: 'Comments'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/comments/update
        const response = await nango.patch({
            endpoint: `/drive/v3/files/${input.file_id}/comments/${input.comment_id}`,
            params: {
                fields: '*'
            },
            data: {
                content: input.content,
                ...(input.resolved !== undefined && { resolved: input.resolved })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Comment not found or could not be updated',
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
            author: comment.author,
            deleted: comment.deleted,
            resolved: comment.resolved,
            replies: comment.replies || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
