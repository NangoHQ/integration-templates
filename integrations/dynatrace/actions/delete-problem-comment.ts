import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('Dynatrace problem ID. Example: "-7461959498347617533_1785332100000V2"'),
    commentId: z.string().describe('Dynatrace problem comment ID. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    problemId: z.string(),
    commentId: z.string()
});

const action = createAction({
    description: 'Delete a problem comment',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.read', 'problems.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems/delete-problem-comment
            endpoint: `/api/v2/problems/${encodeURIComponent(input.problemId)}/comments/${encodeURIComponent(input.commentId)}`,
            retries: 10
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Problem or comment not found',
                problemId: input.problemId,
                commentId: input.commentId
            });
        }

        return {
            success: response.status >= 200 && response.status < 300,
            problemId: input.problemId,
            commentId: input.commentId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
