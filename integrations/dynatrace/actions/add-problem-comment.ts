import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('Dynatrace problem ID. Example: "P-2608522"'),
    message: z.string().describe('Comment message text.'),
    context: z.string().optional().describe('Optional comment context.')
});

const OutputSchema = z.object({
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
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/post-comment
        const response = await nango.post({
            endpoint: `/api/v2/problems/${encodeURIComponent(input.problemId)}/comments`,
            data: {
                message: input.message,
                ...(input.context !== undefined && { context: input.context })
            },
            retries: 3
        });

        if (response.status < 200 || response.status >= 300) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Received unexpected status ${response.status}`,
                problemId: input.problemId
            });
        }

        return {
            problemId: input.problemId,
            message: input.message,
            ...(input.context !== undefined && { context: input.context })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
