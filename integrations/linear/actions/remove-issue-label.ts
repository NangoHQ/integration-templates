import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issue_id: z.string().describe('The ID of the issue to remove the label from. Example: "c7a3f0e2-1b2d-4e3f-9a0b-1c2d3e4f5a6b"'),
    label_id: z.string().describe('The ID of the label to remove. Example: "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    issue: z
        .object({
            id: z.string()
        })
        .optional()
});

const action = createAction({
    description: 'Remove a label from a Linear issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-issue-label',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation IssueRemoveLabel($id: String!, $labelId: String!) {
                issueRemoveLabel(id: $id, labelId: $labelId) {
                    success
                    issue {
                        id
                    }
                }
            }
        `;

        const variables = {
            id: input.issue_id,
            labelId: input.label_id
        };

        // https://developers.linear.app/docs/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 3
        });

        if (!response.data || !response.data.data || !response.data.data.issueRemoveLabel) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API'
            });
        }

        const result = response.data.data.issueRemoveLabel;

        return {
            success: result.success,
            issue: result.issue
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
