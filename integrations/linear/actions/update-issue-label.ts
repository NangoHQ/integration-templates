import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the issue label to update. Example: "b08dbaa2-5ecc-4770-acaf-23894ce84e64"'),
    name: z.string().optional().describe('The new name of the issue label.'),
    color: z.string().optional().describe('The new color of the issue label as a hex string. Example: "#ff0000"'),
    description: z.string().nullable().optional().describe('The new description of the issue label. Pass null to clear.')
});

const ProviderIssueLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    description: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    archivedAt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    archivedAt: z.string().optional()
});

const IssueLabelUpdateResponseSchema = z.object({
    data: z.object({
        issueLabelUpdate: z.object({
            success: z.boolean(),
            issueLabel: ProviderIssueLabelSchema
        })
    })
});

const action = createAction({
    description: 'Update an existing Linear issue label',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

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
                        createdAt
                        updatedAt
                        archivedAt
                    }
                }
            }
        `;

        const variables: Record<string, unknown> = {
            id: input.id
        };

        const updateInput: Record<string, unknown> = {};

        if (input.name !== undefined) {
            updateInput['name'] = input.name;
        }

        if (input.color !== undefined) {
            updateInput['color'] = input.color;
        }

        if (input.description !== undefined) {
            updateInput['description'] = input.description;
        }

        variables['input'] = updateInput;

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables
            },
            retries: 3
        });

        const parsed = IssueLabelUpdateResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API'
            });
        }

        const updateResult = parsed.data.data.issueLabelUpdate;

        if (updateResult.success === false) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Linear reported the label update as unsuccessful',
                labelId: input.id
            });
        }

        const issueLabel = updateResult.issueLabel;

        return {
            id: issueLabel.id,
            name: issueLabel.name,
            ...(issueLabel.color !== undefined && { color: issueLabel.color }),
            ...(issueLabel.description != null && { description: issueLabel.description }),
            ...(issueLabel.createdAt !== undefined && { createdAt: issueLabel.createdAt }),
            ...(issueLabel.updatedAt !== undefined && { updatedAt: issueLabel.updatedAt }),
            ...(issueLabel.archivedAt != null && { archivedAt: issueLabel.archivedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
