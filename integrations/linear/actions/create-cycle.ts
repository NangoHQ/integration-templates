import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID. Example: "9ce955cd-b013-4e79-bd0a-41bec5a67dd1"'),
    name: z.string().describe('Cycle name. Example: "Sprint 1"'),
    description: z.string().optional().describe('The description of the cycle.'),
    startsAt: z.string().datetime().describe('ISO 8601 start datetime. Example: "2024-01-01T00:00:00Z"'),
    endsAt: z.string().datetime().describe('ISO 8601 end datetime. Example: "2024-01-14T23:59:59Z"'),
    completedAt: z.string().datetime().optional().describe('The completion date of the cycle in ISO 8601 format.')
});

const ProviderCycleSchema = z.object({
    id: z.string(),
    name: z.string(),
    number: z.number(),
    description: z.string().nullable().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional(),
    isNext: z.boolean().optional(),
    isPrevious: z.boolean().optional(),
    progress: z.number().optional(),
    team: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            // Nullable/optional so a failed mutation (`errors` present alongside `cycleCreate: null`) still
            // parses and the top-level `errors` check below can surface Linear's real error message.
            cycleCreate: z
                .object({
                    success: z.boolean(),
                    cycle: z.unknown().optional()
                })
                .nullable()
                .optional()
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

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    number: z.number(),
    description: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    completedAt: z.string().optional(),
    isActive: z.boolean().optional(),
    isNext: z.boolean().optional(),
    isPrevious: z.boolean().optional(),
    progress: z.number().optional(),
    team: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a cycle for a Linear team.',
    version: '1.0.5',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation CycleCreate($input: CycleCreateInput!) {
                cycleCreate(input: $input) {
                    success
                    cycle {
                        id
                        name
                        number
                        description
                        startsAt
                        endsAt
                        completedAt
                        isActive
                        isNext
                        isPrevious
                        progress
                        team {
                            id
                            name
                        }
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://linear.app/developers/graphql
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: {
                    input: {
                        teamId: input.teamId,
                        name: input.name,
                        startsAt: input.startsAt,
                        endsAt: input.endsAt,
                        ...(input.description !== undefined && { description: input.description }),
                        ...(input.completedAt !== undefined && { completedAt: input.completedAt })
                    }
                }
            },
            retries: 10
        });

        const graphQLResponse = GraphQLResponseSchema.safeParse(response.data);

        if (!graphQLResponse.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response shape from Linear API.'
            });
        }

        // Linear returns a top-level `errors` array on partial/full failures, sometimes alongside `data: null`.
        const errors = graphQLResponse.data.errors;
        if (errors && errors.length > 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: errors[0]?.message ?? 'Linear API returned GraphQL errors.'
            });
        }

        const payload = graphQLResponse.data.data?.cycleCreate;

        if (!payload || !payload.success || !payload.cycle) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Cycle creation failed or returned no cycle.',
                success: payload?.success ?? false
            });
        }

        const providerCycle = ProviderCycleSchema.parse(payload.cycle);

        return {
            id: providerCycle.id,
            name: providerCycle.name,
            number: providerCycle.number,
            ...(providerCycle.description != null && { description: providerCycle.description }),
            ...(providerCycle.startsAt !== undefined && { startsAt: providerCycle.startsAt }),
            ...(providerCycle.endsAt !== undefined && { endsAt: providerCycle.endsAt }),
            ...(providerCycle.completedAt != null && { completedAt: providerCycle.completedAt }),
            ...(providerCycle.isActive !== undefined && { isActive: providerCycle.isActive }),
            ...(providerCycle.isNext !== undefined && { isNext: providerCycle.isNext }),
            ...(providerCycle.isPrevious !== undefined && { isPrevious: providerCycle.isPrevious }),
            ...(providerCycle.progress !== undefined && { progress: providerCycle.progress }),
            ...(providerCycle.team !== undefined && {
                team: {
                    id: providerCycle.team.id,
                    ...(providerCycle.team.name !== undefined && { name: providerCycle.team.name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
