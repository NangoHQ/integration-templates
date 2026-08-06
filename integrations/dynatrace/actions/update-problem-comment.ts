import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('Problem ID. Example: "-232322341223"'),
    commentId: z.string().describe('Comment ID. Example: "123e4567-e89b-12d3-a456-426614174000"'),
    message: z.string().describe('The updated comment text.'),
    context: z.string().optional().describe('The comment context. Example: "CUSTOM"')
});

const OutputSchema = z.object({
    problemId: z.string(),
    commentId: z.string(),
    updated: z.boolean()
});

const action = createAction({
    description: 'Update the text of an existing problem comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: { message: string; context?: string } = {
            message: input.message
        };

        if (input.context !== undefined) {
            data.context = input.context;
        }

        await nango.put({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/problems/comments
            endpoint: `/api/v2/problems/${encodeURIComponent(input.problemId)}/comments/${encodeURIComponent(input.commentId)}`,
            data,
            retries: 3
        });

        return {
            problemId: input.problemId,
            commentId: input.commentId,
            updated: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
