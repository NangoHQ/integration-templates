import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Cycle ID. Example: "b5327ded-caa0-4290-9f8f-dd2c4ba6eff2"')
});

const ProviderCycleSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    team: z
        .object({
            id: z.string(),
            name: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    progress: z.number().nullable().optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    archivedAt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    team: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    progress: z.number().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    archivedAt: z.string().optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            cycle: z.unknown().optional()
        })
        .nullable()
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Retrieve a Linear cycle by cycle ID.',
    version: '1.0.4',
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

        const graphQLResponse = GraphQLResponseSchema.safeParse(response.data);

        if (!graphQLResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Linear API.'
            });
        }

        // Linear returns a top-level `errors` array on partial/full failures, sometimes alongside `data: null`.
        const errors = graphQLResponse.data.errors;
        if (errors && errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: errors[0]?.message ?? 'Linear API returned GraphQL errors.'
            });
        }

        const cycleData = graphQLResponse.data.data?.cycle;

        if (!cycleData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Cycle with id ${input.id} not found.`
            });
        }

        const providerCycle = ProviderCycleSchema.parse(cycleData);

        return {
            id: providerCycle.id,
            ...(providerCycle.name != null && { name: providerCycle.name }),
            ...(providerCycle.team != null && {
                team: {
                    id: providerCycle.team.id,
                    ...(providerCycle.team.name != null && { name: providerCycle.team.name })
                }
            }),
            ...(providerCycle.progress != null && { progress: providerCycle.progress }),
            ...(providerCycle.startsAt != null && { startsAt: providerCycle.startsAt }),
            ...(providerCycle.endsAt != null && { endsAt: providerCycle.endsAt }),
            ...(providerCycle.archivedAt != null && { archivedAt: providerCycle.archivedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
