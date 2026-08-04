import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('Problem ID. Example: "-7461959498347617533_1785332100000V2"'),
    commentId: z.string().describe('Comment ID. Example: "123456789"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a problem comment',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedProblemId = encodeURIComponent(input.problemId);
        const encodedCommentId = encodeURIComponent(input.commentId);

        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api
        await nango.delete({
            endpoint: `/api/v2/problems/${encodedProblemId}/comments/${encodedCommentId}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
