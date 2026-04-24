import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('The name of the issue label. Example: "Bug"'),
    color: z.string().optional().describe('The color of the label as a HEX string. Example: "#EB5757"'),
    teamId: z.string().optional().describe('The identifier of the team to associate the label with. If omitted, the label will be workspace-level.'),
    description: z.string().optional().describe('The description of the label.')
});

const IssueLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable().optional(),
    team: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional()
});

const ResponseSchema = z.object({
    data: z.object({
        issueLabelCreate: z.object({
            success: z.boolean(),
            issueLabel: IssueLabelSchema
        })
    })
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    path: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    description: z.string().optional(),
    teamId: z.string().optional()
});

const action = createAction({
    description: 'Create a Linear issue label.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-issue-label',
        group: 'Labels'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation IssueLabelCreate($input: IssueLabelCreateInput!) {
                issueLabelCreate(input: $input) {
                    success
                    issueLabel {
                        id
                        name
                        color
                        description
                        team {
                            id
                        }
                    }
                }
            }
        `;

        const variables = {
            input: {
                name: input.name,
                ...(input.color !== undefined && { color: input.color }),
                ...(input.teamId !== undefined && { teamId: input.teamId }),
                ...(input.description !== undefined && { description: input.description })
            }
        };

        const response = await nango.post({
            // https://linear.app/developers/api/graphql
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const raw = z
            .object({
                data: z.unknown(),
                errors: z.array(GraphQLErrorSchema).optional()
            })
            .parse(response.data);

        if (raw.errors && raw.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: raw.errors.map((e) => e.message).join(', ')
            });
        }

        const parsed = ResponseSchema.parse(response.data);

        if (!parsed.data.issueLabelCreate.success) {
            throw new nango.ActionError({
                type: 'mutation_failed',
                message: 'Linear issueLabelCreate mutation returned success: false.'
            });
        }

        const label = parsed.data.issueLabelCreate.issueLabel;

        return {
            id: label.id,
            name: label.name,
            color: label.color,
            ...(label.description != null && { description: label.description }),
            ...(label.team != null && { teamId: label.team.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
