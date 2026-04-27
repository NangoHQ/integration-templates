import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the cycle to update. Example: "cycle-id"'),
    name: z.string().optional().describe('The custom name of the cycle.'),
    description: z.string().optional().describe('The description of the cycle.'),
    startsAt: z.string().optional().describe('The start date and time of the cycle. ISO 8601 format.'),
    endsAt: z.string().optional().describe('The end date and time of the cycle. ISO 8601 format.'),
    completedAt: z.string().nullable().optional().describe('The completion time of the cycle. Pass null to mark as uncompleted.')
});

const ProviderCycleSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    startsAt: z.string(),
    endsAt: z.string(),
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    number: z.number(),
    isActive: z.boolean(),
    isFuture: z.boolean(),
    isNext: z.boolean(),
    isPast: z.boolean(),
    isPrevious: z.boolean(),
    progress: z.number()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            cycleUpdate: z
                .object({
                    success: z.boolean(),
                    lastSyncId: z.number(),
                    cycle: ProviderCycleSchema.nullable()
                })
                .nullable()
        })
        .nullable()
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    startsAt: z.string(),
    endsAt: z.string(),
    completedAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    number: z.number(),
    isActive: z.boolean(),
    isFuture: z.boolean(),
    isNext: z.boolean(),
    isPast: z.boolean(),
    isPrevious: z.boolean(),
    progress: z.number()
});

const action = createAction({
    description: 'Update an existing Linear cycle.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-cycle',
        group: 'Cycles'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cycleInput = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
            ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
            ...(input.completedAt !== undefined && { completedAt: input.completedAt })
        };

        // https://linear.app/developers/graphql
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation CycleUpdate($id: String!, $input: CycleUpdateInput!) {
                        cycleUpdate(id: $id, input: $input) {
                            success
                            lastSyncId
                            cycle {
                                id
                                name
                                description
                                startsAt
                                endsAt
                                completedAt
                                createdAt
                                updatedAt
                                number
                                isActive
                                isFuture
                                isNext
                                isPast
                                isPrevious
                                progress
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id,
                    input: cycleInput
                }
            },
            retries: 1
        });

        const providerPayload = GraphQLResponseSchema.parse(response.data);

        if (providerPayload.errors && providerPayload.errors.length > 0) {
            const firstError = providerPayload.errors[0];
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError?.message ?? 'GraphQL error occurred.'
            });
        }

        const payload = providerPayload.data?.cycleUpdate;
        if (!payload || !payload.success || payload.cycle == null) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Cycle update failed or returned no cycle data.'
            });
        }

        const cycle = payload.cycle;

        return {
            id: cycle.id,
            ...(cycle.name != null && { name: cycle.name }),
            ...(cycle.description != null && { description: cycle.description }),
            startsAt: cycle.startsAt,
            endsAt: cycle.endsAt,
            ...(cycle.completedAt !== undefined && { completedAt: cycle.completedAt }),
            createdAt: cycle.createdAt,
            updatedAt: cycle.updatedAt,
            number: cycle.number,
            isActive: cycle.isActive,
            isFuture: cycle.isFuture,
            isNext: cycle.isNext,
            isPast: cycle.isPast,
            isPrevious: cycle.isPrevious,
            progress: cycle.progress
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
