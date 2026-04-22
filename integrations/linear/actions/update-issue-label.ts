import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label_id: z.string().describe('ID of the label to update. Example: "f33d4e23-1234-5678-9abc-def012345678"'),
    name: z.string().optional().describe('New name for the label'),
    color: z.string().optional().describe('Hex color code for the label. Example: "#FF0000"'),
    description: z.string().optional().describe('Description of the label')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    description: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Update an existing Linear issue label',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-issue-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation IssueLabelUpdate($id: String!, $input: IssueLabelUpdateInput!) {
                issueLabelUpdate(id: $id, input: $input) {
                    success
                    issueLabel {
                        id
                        name
                        color
                        description
                    }
                }
            }
        `;

        const variables = {
            id: input.label_id,
            input: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.color !== undefined && { color: input.color }),
                ...(input.description !== undefined && { description: input.description })
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

        const data = response.data;

        if (data.errors && data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: data.errors[0]?.message || 'GraphQL error occurred',
                errors: data.errors
            });
        }

        const result = data.data?.issueLabelUpdate;

        if (!result?.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update issue label'
            });
        }

        const label = result.issueLabel;

        if (!label) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Label not found after update'
            });
        }

        return {
            id: label.id,
            name: label.name,
            color: label.color,
            description: label.description ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
