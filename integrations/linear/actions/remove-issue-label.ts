import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('The identifier of the issue to remove the label from. Example: "ISS-123"'),
    labelId: z.string().describe('The identifier of the label to remove. Example: "label-uuid"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        issueRemoveLabel: z.object({
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
    })
});

const OutputSchema = z.object({
    success: z.boolean(),
    issueId: z.string(),
    labelId: z.string(),
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
    description: 'Remove a label from a Linear issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-issue-label',
        group: 'Issues'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/docs/graphql/working-with-the-graphql-api
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
                    id: input.issueId,
                    labelId: input.labelId
                }
            },
            retries: 3
        });

        const payload = ProviderResponseSchema.parse(response.data);
        const result = payload.data.issueRemoveLabel;

        return {
            success: result.success,
            issueId: input.issueId,
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
