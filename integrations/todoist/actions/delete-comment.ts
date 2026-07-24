import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('Comment ID. Example: "6h78PmWXw7GQRXMq"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a comment',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.todoist.com/api/v1/#delete-a-comment
        await nango.delete({
            endpoint: `/api/v1/comments/${encodeURIComponent(input.comment_id)}`,
            retries: 10
        });

        return {
            id: input.comment_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
