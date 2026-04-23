import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('The ID of the issue to delete. Example: "d4e6f8a2-3b4c-5d6e-7f8g-9h0i1j2k3l4m"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the issue was successfully deleted'),
    issueId: z.string().describe('The ID of the deleted issue'),
    title: z.union([z.string(), z.null()]).describe('The title of the deleted issue, if available')
});

const action = createAction({
    description: 'Delete a Linear issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueDelete($id: String!) {
                        issueDelete(id: $id) {
                            success
                            entity {
                                id
                                title
                            }
                        }
                    }
                `,
                variables: {
                    id: input.issueId
                }
            },
            retries: 10
        });

        const data = response.data?.data?.issueDelete;

        if (!data || !data.success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete the issue. The issue may not exist or you may not have permission to delete it.',
                issueId: input.issueId
            });
        }

        return {
            success: data.success,
            issueId: data.entity?.id ?? input.issueId,
            title: data.entity?.title ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
