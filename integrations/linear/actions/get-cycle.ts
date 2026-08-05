import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Cycle ID. Example: "b5327ded-caa0-4290-9f8f-dd2c4ba6eff2"')
});

const ProviderCycleSchema = z.object({
    id: z.string(),
    name: z.string(),
    team: z.object({
        id: z.string(),
        name: z.string().optional()
    }),
    progress: z.number(),
    startsAt: z.string(),
    endsAt: z.string(),
    archivedAt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    team: z.object({
        id: z.string(),
        name: z.string().optional()
    }),
    progress: z.number(),
    startsAt: z.string(),
    endsAt: z.string(),
    archivedAt: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a Linear cycle by cycle ID.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            data: {
                query: `
                    query GetCycle($id: String!) {
                        cycle(id: $id) {
                            id
                            name
                            team { id name }
                            progress
                            startsAt
                            endsAt
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

        const cycleData = response.data?.data?.cycle;

        if (!cycleData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Cycle with id ${input.id} not found.`
            });
        }

        const providerCycle = ProviderCycleSchema.parse(cycleData);

        return {
            id: providerCycle.id,
            name: providerCycle.name,
            team: {
                id: providerCycle.team.id,
                ...(providerCycle.team.name !== undefined && { name: providerCycle.team.name })
            },
            progress: providerCycle.progress,
            startsAt: providerCycle.startsAt,
            endsAt: providerCycle.endsAt,
            ...(providerCycle.archivedAt != null && { archivedAt: providerCycle.archivedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
