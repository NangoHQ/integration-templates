import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    comment_id: z.string().describe('The ID of the comment to update. Example: "90150225604615"'),
    comment_text: z.string().describe('The new text content of the comment.'),
    assignee: z.number().optional().describe('The user ID to assign the comment to. Optional.'),
    resolved: z.boolean().optional().describe('Whether the comment is resolved. Optional.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the update was successful.')
});

const action = createAction({
    description: 'Update a comment in ClickUp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: {
            comment_text: string;
            assignee?: number;
            resolved?: boolean;
        } = {
            comment_text: input.comment_text
        };

        if (input.assignee !== undefined) {
            body.assignee = input.assignee;
        }

        if (input.resolved !== undefined) {
            body.resolved = input.resolved;
        }

        // https://developer.clickup.com/reference/update-comment
        await nango.put({
            endpoint: `/api/v2/comment/${encodeURIComponent(input.comment_id)}`,
            data: body,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
