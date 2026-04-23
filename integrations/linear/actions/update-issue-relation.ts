import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    relationId: z.string().describe('The UUID of the issue relation to update. Example: "c87f3b9a-7c4e-4a2e-9b5c-3d2e1f4a5b6c"'),
    type: z.enum(['blocks', 'duplicate', 'related']).optional().describe('The type of relation between issues.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    issueRelation: z.object({
        id: z.string(),
        type: z.enum(['blocks', 'duplicate', 'related'])
    })
});

const action = createAction({
    description: 'Update fields on an existing Linear issue relation.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-issue-relation',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation IssueRelationUpdate($id: String!, $input: IssueRelationUpdateInput!) {
                issueRelationUpdate(id: $id, input: $input) {
                    success
                    issueRelation {
                        id
                        type
                    }
                }
            }
        `;

        const variables = {
            id: input.relationId,
            input: {
                ...(input.type && { type: input.type })
            }
        };

        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 3
        });

        const ResponseSchema = z.object({
            data: z.object({
                issueRelationUpdate: z.object({
                    success: z.boolean(),
                    issueRelation: z.object({
                        id: z.string(),
                        type: z.enum(['blocks', 'duplicate', 'related'])
                    })
                })
            }),
            errors: z.array(z.object({ message: z.string() })).optional()
        });

        const parseResult = ResponseSchema.safeParse(response.data);

        if (!parseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API'
            });
        }

        const data = parseResult.data;

        if (data.errors && data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: data.errors[0]?.message ?? 'Unknown GraphQL error'
            });
        }

        if (!data.data?.issueRelationUpdate?.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update issue relation'
            });
        }

        const result = data.data.issueRelationUpdate;

        return {
            success: result.success,
            issueRelation: {
                id: result.issueRelation.id,
                type: result.issueRelation.type
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
