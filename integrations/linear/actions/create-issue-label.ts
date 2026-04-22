import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the issue label. Example: "Bug"'),
    color: z.string().describe('The color of the label in hex format. Example: "#C52828"'),
    team_id: z
        .string()
        .optional()
        .describe(
            'The ID of the team to create the label for. If not provided, creates a workspace-level label. Example: "8d6bb47f-0897-4ee1-94e5-89269edae96f"'
        ),
    description: z.string().optional().describe('The description of the label. Example: "Issues related to bugs and errors"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    description: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Create a Linear issue label',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-issue-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation IssueLabelCreate($input: IssueLabelCreateInput!) {
                issueLabelCreate(input: $input) {
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
            input: {
                name: input.name,
                color: input.color,
                ...(input.team_id && { teamId: input.team_id }),
                ...(input.description && { description: input.description })
            }
        };

        // https://developers.linear.app/docs/graphql/working-with-the-graphql-api
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 3
        });

        const payload = response.data?.data?.issueLabelCreate;

        if (!payload || !payload.success) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create issue label',
                errors: response.data?.errors
            });
        }

        const label = payload.issueLabel;

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
