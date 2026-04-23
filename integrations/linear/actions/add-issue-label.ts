import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('The ID of the Linear issue. Example: "d0e4f5d3-1111-2222-3333-444444444444"'),
    labelId: z.string().describe('The ID of the label to add to the issue. Example: "d0e4f5d3-1111-2222-3333-555555555555"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    issueId: z.string()
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
                    id: input.issueId,
                    labelId: input.labelId
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
            issueId: input.issueId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
