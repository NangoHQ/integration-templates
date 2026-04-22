import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the workflow state. Example: "abc123"')
});

const TeamSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    team: TeamSchema,
    type: z.string(),
    position: z.number(),
    archived: z.boolean()
});

const action = createAction({
    description: 'Retrieve a Linear workflow state by state ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-workflow-state',
        group: 'Workflow States'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/docs/api/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    query GetWorkflowState($id: String!) {
                        workflowState(id: $id) {
                            id
                            name
                            team {
                                id
                            }
                            type
                            position
                            archivedAt
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        if (!response.data || !response.data.data || !response.data.data.workflowState) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Workflow state not found',
                id: input.id
            });
        }

        const workflowState = response.data.data.workflowState;

        return {
            id: workflowState.id,
            name: workflowState.name,
            team: {
                id: workflowState.team.id
            },
            type: workflowState.type,
            position: workflowState.position,
            archived: workflowState.archivedAt !== null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
