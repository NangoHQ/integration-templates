import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the issue relation to update. Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"'),
    issueId: z
        .string()
        .optional()
        .describe("The identifier of the issue that is related to another issue. Can be a UUID or issue identifier (e.g., 'LIN-123')."),
    relatedIssueId: z.string().optional().describe("The identifier of the related issue. Can be a UUID or issue identifier (e.g., 'LIN-123')."),
    type: z.enum(['blocks', 'duplicate', 'related', 'similar']).optional().describe('The type of relation of the issue to the related issue.')
});

const ProviderIssueRelationSchema = z.object({
    id: z.string(),
    type: z.string(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    archivedAt: z.string().datetime().nullable().optional(),
    issue: z
        .object({
            id: z.string()
        })
        .optional(),
    relatedIssue: z
        .object({
            id: z.string()
        })
        .optional()
});

const ProviderPayloadSchema = z.object({
    data: z.object({
        issueRelationUpdate: z.object({
            success: z.boolean(),
            lastSyncId: z.number(),
            issueRelation: ProviderIssueRelationSchema
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    archivedAt: z.string().datetime().nullable().optional(),
    issueId: z.string().optional(),
    relatedIssueId: z.string().optional()
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
    scopes: ['issues'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: {
            id: string;
            input: {
                issueId?: string;
                relatedIssueId?: string;
                type?: string;
            };
        } = {
            id: input.id,
            input: {}
        };

        if (input.issueId !== undefined) {
            variables.input.issueId = input.issueId;
        }
        if (input.relatedIssueId !== undefined) {
            variables.input.relatedIssueId = input.relatedIssueId;
        }
        if (input.type !== undefined) {
            variables.input.type = input.type;
        }

        const response = await nango.post({
            // https://linear.app/developers/api-reference/graphql/issue-relation-update
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueRelationUpdate($id: String!, $input: IssueRelationUpdateInput!) {
                        issueRelationUpdate(id: $id, input: $input) {
                            success
                            lastSyncId
                            issueRelation {
                                id
                                type
                                createdAt
                                updatedAt
                                archivedAt
                                issue {
                                    id
                                }
                                relatedIssue {
                                    id
                                }
                            }
                        }
                    }
                `,
                variables
            },
            retries: 10
        });

        const payload = ProviderPayloadSchema.parse(response.data);
        const issueRelation = payload.data.issueRelationUpdate.issueRelation;

        return {
            id: issueRelation.id,
            type: issueRelation.type,
            ...(issueRelation.createdAt !== undefined && { createdAt: issueRelation.createdAt }),
            ...(issueRelation.updatedAt !== undefined && { updatedAt: issueRelation.updatedAt }),
            ...(issueRelation.archivedAt !== undefined && { archivedAt: issueRelation.archivedAt }),
            ...(issueRelation.issue !== undefined && { issueId: issueRelation.issue.id }),
            ...(issueRelation.relatedIssue !== undefined && { relatedIssueId: issueRelation.relatedIssue.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
