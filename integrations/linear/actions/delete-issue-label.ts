import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label_id: z.string().describe('The ID of the issue label to delete. Example: "b8a02392-5b5a-4d2c-85e4-324f4f0594bb"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    label_id: z.string()
});

const action = createAction({
    description: 'Delete a Linear issue label',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-issue-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin', 'issues:create', 'issues:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers
        // https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/Mutation
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueLabelDelete($id: String!) {
                        issueLabelDelete(id: $id) {
                            success
                        }
                    }
                `,
                variables: {
                    id: input.label_id
                }
            },
            retries: 1
        });

        if (!response.data?.data?.issueLabelDelete) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete issue label',
                label_id: input.label_id
            });
        }

        return {
            success: response.data.data.issueLabelDelete.success,
            label_id: input.label_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
