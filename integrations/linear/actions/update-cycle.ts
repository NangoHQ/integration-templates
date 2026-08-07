import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Cycle ID. Example: "b5327ded-caa0-4290-9f8f-dd2c4ba6eff2"'),
    name: z.string().optional().describe('The custom name of the cycle.'),
    description: z.string().optional().describe('The description of the cycle.'),
    startsAt: z.string().optional().describe('The start date of the cycle (ISO 8601).'),
    endsAt: z.string().optional().describe('The end date of the cycle (ISO 8601).'),
    completedAt: z.string().nullable().optional().describe('The completion time of the cycle. Pass null to mark as uncompleted.')
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string().nullable()
});

const ProviderCycleSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    description: z.string().nullable().optional(),
    number: z.number(),
    startsAt: z.string().nullable(),
    endsAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    isActive: z.boolean().optional(),
    isFuture: z.boolean().optional(),
    isNext: z.boolean().optional(),
    isPast: z.boolean().optional(),
    isPrevious: z.boolean().optional(),
    progress: z.number().optional(),
    archivedAt: z.string().nullable(),
    team: ProviderTeamSchema.nullable()
});

const ProviderPayloadSchema = z.object({
    success: z.boolean(),
    cycle: ProviderCycleSchema.nullable()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            cycleUpdate: ProviderPayloadSchema
        })
        .nullable(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    number: z.number().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    completedAt: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    isActive: z.boolean().optional(),
    isFuture: z.boolean().optional(),
    isNext: z.boolean().optional(),
    isPast: z.boolean().optional(),
    isPrevious: z.boolean().optional(),
    progress: z.number().optional(),
    archivedAt: z.string().optional(),
    team: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update an existing Linear cycle.',
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation CycleUpdate($id: String!, $input: CycleUpdateInput!) {
                cycleUpdate(id: $id, input: $input) {
                    success
                    cycle {
                        id
                        name
                        description
                        number
                        startsAt
                        endsAt
                        completedAt
                        createdAt
                        updatedAt
                        isActive
                        isFuture
                        isNext
                        isPast
                        isPrevious
                        progress
                        archivedAt
                        team {
                            id
                            name
                        }
                    }
                }
            }
        `;

        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: {
                    id: input.id,
                    input: {
                        ...(input.name !== undefined && { name: input.name }),
                        ...(input.description !== undefined && { description: input.description }),
                        ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
                        ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
                        ...(input.completedAt !== undefined && { completedAt: input.completedAt })
                    }
                }
            },
            retries: 3
        });

        const body = ProviderResponseSchema.parse(response.data);

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: body.errors.map((e) => e.message).join(', ')
            });
        }

        if (!body.data || !body.data.cycleUpdate.success || !body.data.cycleUpdate.cycle) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Cycle update was not successful.'
            });
        }

        const cycle = body.data.cycleUpdate.cycle;

        return {
            id: cycle.id,
            ...(cycle.name != null && { name: cycle.name }),
            ...(cycle.description != null && { description: cycle.description }),
            number: cycle.number,
            ...(cycle.startsAt != null && { startsAt: cycle.startsAt }),
            ...(cycle.endsAt != null && { endsAt: cycle.endsAt }),
            ...(cycle.completedAt != null && { completedAt: cycle.completedAt }),
            ...(cycle.createdAt !== undefined && { createdAt: cycle.createdAt }),
            ...(cycle.updatedAt !== undefined && { updatedAt: cycle.updatedAt }),
            ...(cycle.isActive !== undefined && { isActive: cycle.isActive }),
            ...(cycle.isFuture !== undefined && { isFuture: cycle.isFuture }),
            ...(cycle.isNext !== undefined && { isNext: cycle.isNext }),
            ...(cycle.isPast !== undefined && { isPast: cycle.isPast }),
            ...(cycle.isPrevious !== undefined && { isPrevious: cycle.isPrevious }),
            ...(cycle.progress !== undefined && { progress: cycle.progress }),
            ...(cycle.archivedAt != null && { archivedAt: cycle.archivedAt }),
            ...(cycle.team != null && {
                team: {
                    id: cycle.team.id,
                    ...(cycle.team.name != null && { name: cycle.team.name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
