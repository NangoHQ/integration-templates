import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the issue to remove the label from. Example: "6948bf28-149d-489b-8f0d-eebae9be8324"'),
    labelId: z.string().describe('The identifier of the label to remove from the issue. Example: "b08dbaa2-5ecc-4770-acaf-23894ce84e64"')
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z
        .object({
            code: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            issueRemoveLabel: z
                .object({
                    success: z.boolean(),
                    issue: z
                        .object({
                            id: z.string(),
                            identifier: z.string().optional(),
                            title: z.string().optional(),
                            updatedAt: z.string().optional()
                        })
                        .optional()
                        .nullable()
                })
                .optional()
        })
        .nullable(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    issueId: z.string().optional(),
    labelId: z.string().optional(),
    issue: z
        .object({
            id: z.string(),
            identifier: z.string().optional(),
            title: z.string().optional(),
            updatedAt: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Remove a label from a Linear issue',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers/graphql/mutations#issueRemoveLabel
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation IssueRemoveLabel($id: String!, $labelId: String!) {
                        issueRemoveLabel(id: $id, labelId: $labelId) {
                            success
                            issue {
                                id
                                identifier
                                title
                                updatedAt
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id,
                    labelId: input.labelId
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const errors = providerResponse.errors;
        if (errors) {
            for (const error of errors) {
                throw new nango.ActionError({
                    type: 'linear_api_error',
                    message: error.message,
                    code: error.extensions?.code
                });
            }
        }

        if (!providerResponse.data || !providerResponse.data.issueRemoveLabel) {
            throw new nango.ActionError({
                type: 'linear_api_error',
                message: 'Unexpected response from Linear API: missing issueRemoveLabel data'
            });
        }

        const result = providerResponse.data.issueRemoveLabel;

        return {
            success: result.success,
            issueId: input.id,
            labelId: input.labelId,
            ...(result.issue && {
                issue: {
                    id: result.issue.id,
                    ...(result.issue.identifier !== undefined && { identifier: result.issue.identifier }),
                    ...(result.issue.title !== undefined && { title: result.issue.title }),
                    ...(result.issue.updatedAt !== undefined && { updatedAt: result.issue.updatedAt })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
