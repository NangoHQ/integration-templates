import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    commentId: z.string().min(1).describe('The ID of the comment to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the comment was successfully deleted')
});

const action = createAction({
    description: 'Delete or archive a comment in Box',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-comment',
        group: 'Comments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        try {
            // https://developer.box.com/reference/delete-comments-id/
            await nango.delete({
                endpoint: `/2.0/comments/${input.commentId}`,
                retries: 3
            });

            return { success: true };
        } catch (error: unknown) {
            // @allowTryCatch
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof error.response === 'object' &&
                error.response !== null &&
                'status' in error.response &&
                error.response.status === 404
            ) {
                return { success: true };
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
