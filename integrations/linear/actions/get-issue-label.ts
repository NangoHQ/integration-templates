import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    labelId: z.string().describe('The ID of the issue label to retrieve. Example: "abc123-def456"')
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    team: TeamSchema.nullable(),
    archived: z.boolean()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            issueLabel: z
                .object({
                    id: z.string(),
                    name: z.string(),
                    color: z.string(),
                    team: z
                        .object({
                            id: z.string(),
                            name: z.string()
                        })
                        .nullable(),
                    archivedAt: z.string().nullable()
                })
                .nullable()
        })
        .nullable(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                path: z.array(z.union([z.string(), z.number()])).optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a Linear issue label by label ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-issue-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query GetIssueLabel($id: String!) {
                issueLabel(id: $id) {
                    id
                    name
                    color
                    team {
                        id
                        name
                    }
                    archivedAt
                }
            }
        `;

        const variables = {
            id: input.labelId
        };

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Linear API response',
                details: parsed.error.message
            });
        }

        const responseData = parsed.data;

        const firstError = responseData.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message,
                errors: responseData.errors
            });
        }

        const issueLabel = responseData.data?.issueLabel;

        if (!issueLabel) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Issue label with ID '${input.labelId}' not found`
            });
        }

        return {
            id: issueLabel.id,
            name: issueLabel.name,
            color: issueLabel.color,
            team: issueLabel.team,
            archived: issueLabel.archivedAt !== null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
