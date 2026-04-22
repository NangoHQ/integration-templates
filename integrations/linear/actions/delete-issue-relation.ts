import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    relation_id: z.string().describe('The ID of the issue relation to delete. Example: "relation-uuid-123"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    relation_id: z.string()
});

const GraphQLResponseSchema = z.object({
    data: z
        .union([
            z.object({
                issueRelationDelete: z
                    .object({
                        success: z.boolean()
                    })
                    .optional()
            }),
            z.null()
        ])
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Delete a relationship between two Linear issues',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-issue-relation',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation IssueRelationDelete($id: String!) {
                issueRelationDelete(id: $id) {
                    success
                }
            }
        `;

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    id: input.relation_id
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse GraphQL response',
                details: parsed.error.format()
            });
        }

        const data = parsed.data;

        const graphQLError = data.errors?.[0];
        if (graphQLError) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: graphQLError.message,
                code: graphQLError.extensions?.code
            });
        }

        const success = data.data?.issueRelationDelete?.success ?? false;

        if (!success) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete issue relation',
                relation_id: input.relation_id
            });
        }

        return {
            success: true,
            relation_id: input.relation_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
