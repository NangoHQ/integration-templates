import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fileId: z.string().describe('The ID of the file containing the comment. Example: "1oD5i7NbLYQ6_mzEjNIXSqFvKXvvRNETwkfLrlDooFV0"'),
    commentId: z.string().describe('The ID of the comment to delete. Example: "AAAB1rDkxSA"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful'),
    fileId: z.string().describe('The ID of the file from which the comment was deleted'),
    commentId: z.string().describe('The ID of the deleted comment')
});

const action = createAction({
    description: 'Delete a comment from a file',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment',
        group: 'Comments'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/comments/delete
        await nango.delete({
            endpoint: `drive/v3/files/${input.fileId}/comments/${input.commentId}`,
            retries: 3
        });

        return {
            success: true,
            fileId: input.fileId,
            commentId: input.commentId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
