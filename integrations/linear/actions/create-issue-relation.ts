import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('ID of the primary issue. Example: "6948bf28-149d-489b-8f0d-eebae9be8324"'),
    relatedIssueId: z.string().describe('ID of the related issue. Example: "d12c5fa1-d3e6-493a-8873-f511870c8427"'),
    type: z.enum(['blocks', 'duplicate', 'related', 'similar']).describe('Type of relationship between the issues.')
});

const ProviderIssueRelationSchema = z.object({
    id: z.string(),
    type: z.string(),
    issue: z.object({
        id: z.string(),
        identifier: z.string().optional()
    }),
    relatedIssue: z.object({
        id: z.string(),
        identifier: z.string().optional()
    })
});

const ProviderResponseSchema = z.object({
    data: z.object({
        issueRelationCreate: z.object({
            success: z.boolean(),
            issueRelation: ProviderIssueRelationSchema.nullable()
        })
    }),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .default([])
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    issueId: z.string(),
    issueIdentifier: z.string().optional(),
    relatedIssueId: z.string(),
    relatedIssueIdentifier: z.string().optional()
});

const action = createAction({
    description: 'Create a relationship between two Linear issues.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'], // Linear GraphQL mutations require a write-capable token

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueRelationCreate($input: IssueRelationCreateInput!) {
                        issueRelationCreate(input: $input) {
                            success
                            issueRelation {
                                id
                                type
                                issue {
                                    id
                                    identifier
                                }
                                relatedIssue {
                                    id
                                    identifier
                                }
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        issueId: input.issueId,
                        relatedIssueId: input.relatedIssueId,
                        type: input.type
                    }
                }
            },
            retries: 3
        });

        const parsedResult = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API.',
                details: parsedResult.error.issues
            });
        }

        const parsed = parsedResult.data;

        const firstError = parsed.errors[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message
            });
        }

        const relation = parsed.data.issueRelationCreate.issueRelation;
        if (!relation) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'issueRelationCreate succeeded but returned no issueRelation.'
            });
        }

        return {
            id: relation.id,
            type: relation.type,
            issueId: relation.issue.id,
            ...(relation.issue.identifier != null && { issueIdentifier: relation.issue.identifier }),
            relatedIssueId: relation.relatedIssue.id,
            ...(relation.relatedIssue.identifier != null && { relatedIssueIdentifier: relation.relatedIssue.identifier })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
