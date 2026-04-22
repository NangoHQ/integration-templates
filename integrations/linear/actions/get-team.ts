import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().describe('Linear team ID. Example: "team-uuid-123"')
});

const WorkflowStateSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.union([z.string(), z.null()]),
    states: z.array(WorkflowStateSchema)
});

const action = createAction({
    description: 'Retrieve a Linear team by team ID',
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
        const query = `
            query Team($id: String!) {
                team(id: $id) {
                    id
                    key
                    name
                    description
                    states {
                        nodes {
                            id
                            name
                            color
                        }
                    }
                }
            }
        `;

        const variables = {
            id: input.team_id
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

        const data = response.data;

        if (!data || !data.data || !data.data.team) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team not found',
                team_id: input.team_id
            });
        }

        const team = data.data.team;
        const statesNodes = team.states?.nodes || [];

        return {
            id: team.id,
            key: team.key,
            name: team.name,
            description: team.description ?? null,
            states: statesNodes.map((state: { id: string; name: string; color: string | null }) => ({
                id: state.id,
                name: state.name,
                color: state.color ?? null
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
