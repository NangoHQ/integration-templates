import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issue_id: z.string().describe('The ID of the first issue in the relationship. Example: "abc123-def456-ghi789"'),
    related_issue_id: z.string().describe('The ID of the second issue in the relationship. Example: "xyz789-uvw456-rst123"'),
    type: z.enum(['blocks', 'duplicate', 'related']).describe('The type of relationship between the issues. Options: blocks, duplicate, related')
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the created issue relation'),
    type: z.enum(['blocks', 'duplicate', 'related']).describe('The type of relationship'),
    success: z.boolean().describe('Whether the mutation was successful')
});

const LinearIssueRelationType = z.enum(['blocks', 'duplicate', 'related']);

const GraphQLErrorSchema = z.object({
    message: z.string()
});

const IssueRelationResponseSchema = z.object({
    data: z.object({
        issueRelationCreate: z.object({
            success: z.boolean(),
            issueRelation: z.object({
                id: z.string(),
                type: LinearIssueRelationType
            })
        })
    }),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'Create a relationship between two Linear issues',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-issue-relation',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:create', 'issues:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation IssueRelationCreate($input: IssueRelationCreateInput!) {
                issueRelationCreate(input: $input) {
                    success
                    issueRelation {
                        id
                        type
                    }
                }
            }
        `;

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: {
                    input: {
                        issueId: input.issue_id,
                        relatedIssueId: input.related_issue_id,
                        type: input.type
                    }
                }
            },
            retries: 3
        });

        const parseResult = IssueRelationResponseSchema.safeParse(response.data);

        if (!parseResult.success) {
            const errorData = z.object({ errors: z.array(GraphQLErrorSchema).optional() }).safeParse(response.data);
            if (errorData.success && errorData.data.errors && errorData.data.errors.length > 0) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: errorData.data.errors[0]?.message ?? 'GraphQL error occurred'
                });
            }
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Linear API'
            });
        }

        const result = parseResult.data.data.issueRelationCreate;

        return {
            id: result.issueRelation.id,
            type: result.issueRelation.type,
            success: result.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
