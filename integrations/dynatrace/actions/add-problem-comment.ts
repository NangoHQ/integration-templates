import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('The ID of the problem to comment on. Example: "P-123" or a numeric problem ID.'),
    message: z.string().describe('The text of the comment.'),
    context: z.string().optional().describe('The context of the comment. Example: "USER_COMMENT"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    problemId: z.string(),
    message: z.string(),
    context: z.string().optional()
});

const action = createAction({
    description: 'Add a comment to a problem',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/comments/post-comment
        const response = await nango.post({
            endpoint: `/api/v2/problems/${encodeURIComponent(input.problemId)}/comments`,
            data: {
                message: input.message,
                ...(input.context !== undefined && { context: input.context })
            },
            retries: 10
        });

        if (response.status !== 200 && response.status !== 201) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Unexpected status code: ${response.status}`
            });
        }

        return {
            success: true,
            problemId: input.problemId,
            message: input.message,
            ...(input.context !== undefined && { context: input.context })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
