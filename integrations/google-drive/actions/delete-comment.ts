import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The ID of the file containing the comment. Example: "1oD5i7NbLYQ6_mzEjNIXSqFvKXvvRNETwkfLrlDooFV0"'),
    comment_id: z.string().describe('The ID of the comment to delete. Example: "AAAB1rDkxSA"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the deletion was successful'),
    file_id: z.string().describe('The ID of the file from which the comment was deleted'),
    comment_id: z.string().describe('The ID of the deleted comment')
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
            endpoint: `drive/v3/files/${input.file_id}/comments/${input.comment_id}`,
            retries: 10
        });

        return {
            success: true,
            file_id: input.file_id,
            comment_id: input.comment_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
