import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cycleId: z.string().describe('The unique identifier of the Linear cycle. Example: "d0f4f0b4-7c2e-4c7a-9c8e-2a5e8a6d9c7e"')
});

const TeamSchema = z.object({
    id: z.string(),
    name: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    number: z.number(),
    team: z.union([TeamSchema, z.null()]),
    progress: z.number(),
    startsAt: z.union([z.string(), z.null()]),
    endsAt: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Retrieve a Linear cycle by cycle ID',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-cycle',
        group: 'Cycles'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query GetCycle($id: String!) {
                cycle(id: $id) {
                    id
                    name
                    number
                    team {
                        id
                        name
                    }
                    progress
                    startsAt
                    endsAt
                }
            }
        `;

        // https://linear.app/developers
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query,
                variables: {
                    id: input.cycleId
                }
            },
            retries: 3
        });

        const cycleData = response.data?.data?.cycle;

        if (!cycleData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Cycle not found',
                cycleId: input.cycleId
            });
        }

        return {
            id: cycleData.id,
            name: cycleData.name ?? null,
            number: cycleData.number,
            team: cycleData.team
                ? {
                      id: cycleData.team.id,
                      name: cycleData.team.name
                  }
                : null,
            progress: cycleData.progress ?? 0,
            startsAt: cycleData.startsAt ?? null,
            endsAt: cycleData.endsAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
