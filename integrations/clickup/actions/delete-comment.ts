import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('The ID of the comment to delete. Example: "90150225604615"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the comment was successfully deleted')
});

const action = createAction({
    description: 'Delete a comment in ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/deletecomment
        await nango.delete({
            endpoint: `/api/v2/comment/${encodeURIComponent(input.comment_id)}`,
            retries: 10
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
