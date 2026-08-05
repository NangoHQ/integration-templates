import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID. Example: "9ce955cd-b013-4e79-bd0a-41bec5a67dd1"'),
    name: z.string().describe('Cycle name. Example: "Sprint 1"'),
    description: z.string().optional().describe('The description of the cycle.'),
    startsAt: z.string().describe('ISO 8601 start datetime. Example: "2024-01-01T00:00:00Z"'),
    endsAt: z.string().describe('ISO 8601 end datetime. Example: "2024-01-14T23:59:59Z"'),
    completedAt: z.string().optional().describe('The completion date of the cycle in ISO 8601 format.')
});

const ProviderCycleSchema = z.object({
    id: z.string(),
    name: z.string(),
    number: z.number(),
    description: z.string().nullable().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    completedAt: z.string().nullable().optional(),
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
    version: '1.0.3',
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

        if (response.data == null || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response from Linear API.'
            });
        }

        const graphQLResponse = z
            .object({
                errors: z.array(z.unknown()).optional(),
                data: z.unknown()
            })
            .safeParse(response.data);

        if (!graphQLResponse.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response shape from Linear API.'
            });
        }

        if (graphQLResponse.data.errors && graphQLResponse.data.errors.length > 0) {
            const firstError = z.object({ message: z.string() }).safeParse(graphQLResponse.data.errors[0]);
            throw new nango.ActionError({
                type: 'api_error',
                message: firstError.success ? firstError.data.message : 'Linear API returned GraphQL errors.'
            });
        }

        const cycleCreateResult = z
            .object({
                cycleCreate: z.object({
                    success: z.boolean(),
                    cycle: z.unknown()
                })
            })
            .safeParse(graphQLResponse.data.data);

        if (!cycleCreateResult.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Unexpected response shape from Linear API: missing cycleCreate.'
            });
        }

        if (cycleCreateResult.data.cycleCreate.success !== true) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Linear cycleCreate reported failure.'
            });
        }

        const providerCycle = ProviderCycleSchema.parse(cycleCreateResult.data.cycleCreate.cycle);

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
