import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Team ID. Example: "team-id-123"')
});

const TeamStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    type: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    key: z.string(),
    description: z.string().optional(),
    states: z.array(TeamStateSchema).optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .union([
            z.null(),
            z.object({
                team: z
                    .union([
                        z.null(),
                        z.object({
                            id: z.string(),
                            name: z.string(),
                            key: z.string(),
                            description: z.string().nullable().optional(),
                            states: z
                                .object({
                                    nodes: z
                                        .array(
                                            z.object({
                                                id: z.string(),
                                                name: z.string(),
                                                color: z.string().nullable().optional(),
                                                type: z.string().nullable().optional()
                                            })
                                        )
                                        .optional()
                                })
                                .optional()
                        })
                    ])
                    .optional()
            })
        ])
        .optional()
});

const action = createAction({
    description: 'Retrieve a Linear team by team ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-team',
        group: 'Teams'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    query Team($id: String!) {
                        team(id: $id) {
                            id
                            name
                            key
                            description
                            states {
                                nodes {
                                    id
                                    name
                                    color
                                    type
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response structure from Linear API'
            });
        }

        const team = parsed.data.data?.team;
        if (!team) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Team not found: ${input.id}`
            });
        }

        const output: z.infer<typeof OutputSchema> = {
            id: team.id,
            name: team.name,
            key: team.key
        };

        if (team.description != null) {
            output.description = team.description;
        }

        if (team.states?.nodes != null) {
            output.states = team.states.nodes.map((state) => {
                const stateOutput: z.infer<typeof TeamStateSchema> = {
                    id: state.id,
                    name: state.name
                };

                if (state.color != null) {
                    stateOutput.color = state.color;
                }

                if (state.type != null) {
                    stateOutput.type = state.type;
                }

                return stateOutput;
            });
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
