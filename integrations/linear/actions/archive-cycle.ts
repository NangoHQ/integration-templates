import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the cycle to archive. Example: "cycle-uuid"')
});

const ProviderCycleSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    number: z.number(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    completedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const ProviderPayloadSchema = z.object({
    success: z.boolean(),
    entity: ProviderCycleSchema.nullable().optional(),
    lastSyncId: z.number().optional()
});

const GraphQlResponseSchema = z.object({
    data: z
        .object({
            cycleArchive: ProviderPayloadSchema
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    number: z.number(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    completedAt: z.string().optional(),
    success: z.boolean()
});

const action = createAction({
    description: 'Archive a Linear cycle.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/archive-cycle',
        group: 'Cycles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/api-ops/cycle-archive
            endpoint: '/graphql',
            data: {
                query: `
                    mutation CycleArchive($id: String!) {
                        cycleArchive(id: $id) {
                            success
                            entity {
                                id
                                name
                                number
                                startsAt
                                endsAt
                                completedAt
                                createdAt
                                updatedAt
                            }
                            lastSyncId
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 10
        });

        const parsed = GraphQlResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Linear GraphQL returned errors',
                errors: parsed.errors
            });
        }

        const payload = parsed.data?.cycleArchive;
        if (!payload) {
            throw new nango.ActionError({
                type: 'archive_failed',
                message: 'Failed to archive cycle: no payload returned'
            });
        }

        if (!payload.success) {
            throw new nango.ActionError({
                type: 'archive_failed',
                message: 'Cycle archive mutation returned success: false'
            });
        }

        const entity = payload.entity;
        if (!entity) {
            throw new nango.ActionError({
                type: 'archive_failed',
                message: 'Cycle archive mutation returned no entity'
            });
        }

        return {
            id: entity.id,
            ...(entity.name != null && { name: entity.name }),
            number: entity.number,
            ...(entity.startsAt !== undefined && { startsAt: entity.startsAt }),
            ...(entity.endsAt !== undefined && { endsAt: entity.endsAt }),
            ...(entity.completedAt != null && { completedAt: entity.completedAt }),
            success: payload.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
