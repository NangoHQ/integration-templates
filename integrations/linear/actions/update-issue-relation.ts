import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the issue relation to update. Example: "68210980-dc89-432d-bfa0-a7d6055b9715"'),
    issueId: z
        .string()
        .optional()
        .describe("The identifier of the issue that is related to another issue. Can be a UUID or issue identifier (e.g., 'LIN-123')."),
    relatedIssueId: z.string().optional().describe("The identifier of the related issue. Can be a UUID or issue identifier (e.g., 'LIN-123')."),
    type: z.enum(['blocks', 'duplicate', 'related', 'similar']).optional().describe('The type of relation of the issue to the related issue.')
});

const ProviderIssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string()
});

const ProviderIssueRelationSchema = z.object({
    id: z.string(),
    type: z.string(),
    issue: ProviderIssueSchema.optional(),
    relatedIssue: ProviderIssueSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        issueRelationUpdate: z.object({
            success: z.boolean(),
            issueRelation: ProviderIssueRelationSchema.nullable()
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    issueId: z.string().optional(),
    issueIdentifier: z.string().optional(),
    issueTitle: z.string().optional(),
    relatedIssueId: z.string().optional(),
    relatedIssueIdentifier: z.string().optional(),
    relatedIssueTitle: z.string().optional()
});

const action = createAction({
    description: 'Update fields on an existing Linear issue relation.',
    version: '1.0.3',
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
                        issue {
                            id
                            identifier
                            title
                        }
                        relatedIssue {
                            id
                            identifier
                            title
                        }
                    }
                }
            }
        `;

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: {
                    id: input.id,
                    input: {
                        ...(input.issueId !== undefined && { issueId: input.issueId }),
                        ...(input.relatedIssueId !== undefined && { relatedIssueId: input.relatedIssueId }),
                        ...(input.type !== undefined && { type: input.type })
                    }
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from Linear API.'
            });
        }

        const errorCheck = z.object({ errors: z.array(z.unknown()) }).safeParse(response.data);
        if (errorCheck.success && errorCheck.data.errors.length > 0) {
            const first = errorCheck.data.errors[0];
            const msg = z.object({ message: z.string() }).safeParse(first);
            throw new nango.ActionError({
                type: 'graphql_error',
                message: msg.success ? msg.data.message : 'GraphQL error'
            });
        }

        const parsedResult = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API.',
                details: parsedResult.error.issues
            });
        }

        const parsed = parsedResult.data;

        if (!parsed.data.issueRelationUpdate.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Linear issue relation update reported failure.'
            });
        }

        const relation = parsed.data.issueRelationUpdate.issueRelation;
        if (!relation) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Issue relation not found or not returned after update.'
            });
        }

        return {
            id: relation.id,
            type: relation.type,
            ...(relation.issue !== undefined && {
                issueId: relation.issue.id,
                issueIdentifier: relation.issue.identifier,
                issueTitle: relation.issue.title
            }),
            ...(relation.relatedIssue !== undefined && {
                relatedIssueId: relation.relatedIssue.id,
                relatedIssueIdentifier: relation.relatedIssue.identifier,
                relatedIssueTitle: relation.relatedIssue.title
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
