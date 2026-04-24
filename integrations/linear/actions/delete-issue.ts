import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the issue to delete. Example: "3e03fa02-a23a-40ac-93f4-bbdfd6120caf"')
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            issueDelete: z
                .object({
                    success: z.boolean(),
                    lastSyncId: z.number().optional()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                path: z.array(z.string()).optional(),
                extensions: z
                    .object({
                        code: z.string().optional(),
                        userPresentableMessage: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const action = createAction({
    description: 'Delete a Linear issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-issue',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers/api-reference/GraphQL/mutations/issueDelete
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueDelete($id: String!) {
                        issueDelete(id: $id) {
                            success
                            lastSyncId
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API',
                details: parsed.error.message
            });
        }

        const issueDelete = parsed.data.data?.issueDelete;
        if (!issueDelete || !issueDelete.success) {
            const errorMessage = parsed.data.errors?.[0]?.message ?? 'Failed to delete the issue';
            throw new nango.ActionError({
                type: 'deletion_failed',
                message: errorMessage,
                issue_id: input.id
            });
        }

        return {
            success: issueDelete.success,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
