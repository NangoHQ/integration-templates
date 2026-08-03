import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('The ID of the problem. Example: "P-2608312"'),
    commentId: z.string().describe('The ID of the comment to update. Example: "8675602222913308574_1785774900000"'),
    message: z.string().describe('The new text of the comment.'),
    context: z.string().describe('The context of the comment. Example: "CUSTOM"')
});

const OutputSchema = z.object({
    problemId: z.string(),
    commentId: z.string(),
    message: z.string(),
    context: z.string()
});

const action = createAction({
    description: 'Update the text of an existing problem comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.read', 'problems.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/put-comment
        await nango.put({
            endpoint: `/api/v2/problems/${encodeURIComponent(input.problemId)}/comments/${encodeURIComponent(input.commentId)}`,
            data: {
                message: input.message,
                context: input.context
            },
            retries: 1
        });

        return {
            problemId: input.problemId,
            commentId: input.commentId,
            message: input.message,
            context: input.context
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
