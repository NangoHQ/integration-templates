import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issue_id: z.string().describe('The ID of the Linear issue. Example: "d0e4f5d3-1111-2222-3333-444444444444"'),
    label_id: z.string().describe('The ID of the label to add to the issue. Example: "d0e4f5d3-1111-2222-3333-555555555555"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    issue_id: z.string()
});

const action = createAction({
    description: 'Attach a label to a Linear issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-issue-label',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            data: {
                query: `mutation IssueAddLabel($id: String!, $labelId: String!) {
                    issueAddLabel(id: $id, labelId: $labelId) {
                        success
                    }
                }`,
                variables: {
                    id: input.issue_id,
                    labelId: input.label_id
                }
            },
            retries: 3
        });

        if (response.data?.errors?.length > 0) {
            const error = response.data.errors[0];
            throw new nango.ActionError({
                type: 'graphql_error',
                message: error.message,
                code: error.extensions?.code
            });
        }

        const issueAddLabel = response.data?.data?.issueAddLabel;
        if (!issueAddLabel) {
            throw new nango.ActionError({
                type: 'mutation_failed',
                message: 'Failed to add label to issue'
            });
        }

        return {
            success: issueAddLabel.success,
            issue_id: input.issue_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
