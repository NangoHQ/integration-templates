import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the Linear cycle. Example: "cycle-id-123"')
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderCycleSchema = z.object({
    id: z.string(),
    team: ProviderTeamSchema.nullable().optional(),
    progress: z.number().nullable().optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    team: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    progress: z.number().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a Linear cycle by cycle ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-cycle',
        group: 'Cycles'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: 'query Cycle($id: String!) { cycle(id: $id) { id team { id name } progress startsAt endsAt } }',
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
            ...(providerCycle.team != null && {
                team: {
                    id: providerCycle.team.id,
                    name: providerCycle.team.name
                }
            }),
            ...(providerCycle.progress != null && { progress: providerCycle.progress }),
            ...(providerCycle.startsAt != null && { startsAt: providerCycle.startsAt }),
            ...(providerCycle.endsAt != null && { endsAt: providerCycle.endsAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
