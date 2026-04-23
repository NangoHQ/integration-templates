import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID. Example: "team-uuid"'),
    name: z.string().describe('Cycle name. Example: "Sprint 14"'),
    startsAt: z.string().describe('Cycle start date in ISO 8601 format. Example: "2026-03-03T00:00:00.000Z"'),
    endsAt: z.string().describe('Cycle end date in ISO 8601 format. Example: "2026-03-17T00:00:00.000Z"'),
    description: z.string().optional().describe('Optional cycle description.')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
    description: z.union([z.string(), z.null()]),
    success: z.boolean()
});

const action = createAction({
    description: 'Create a cycle for a Linear team.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-cycle',
        group: 'Cycles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation($input: CycleCreateInput!) {
                cycleCreate(input: $input) {
                    success
                    cycle {
                        id
                        name
                        startsAt
                        endsAt
                        description
                    }
                }
            }
        `;

        const variables = {
            input: {
                teamId: input.teamId,
                name: input.name,
                startsAt: input.startsAt,
                endsAt: input.endsAt,
                ...(input.description && { description: input.description })
            }
        };

        // https://developers.linear.app/docs/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables
            },
            retries: 3
        });

        if (!response.data || !response.data.data || !response.data.data.cycleCreate) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response from Linear API'
            });
        }

        const result = response.data.data.cycleCreate;

        if (!result.success) {
            throw new nango.ActionError({
                type: 'cycle_creation_failed',
                message: 'Failed to create cycle'
            });
        }

        if (!result.cycle) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Cycle was not returned after creation'
            });
        }

        return {
            id: result.cycle.id,
            name: result.cycle.name,
            startsAt: result.cycle.startsAt,
            endsAt: result.cycle.endsAt,
            description: result.cycle.description ?? null,
            success: result.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
