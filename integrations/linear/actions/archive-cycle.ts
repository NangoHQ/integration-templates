import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cycleId: z.string().describe('The ID of the cycle to archive. Example: "cycle-123"')
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the archived cycle'),
    name: z.union([z.string(), z.null()]).describe('The name of the archived cycle'),
    archivedAt: z.union([z.string(), z.null()]).describe('The timestamp when the cycle was archived')
});

const action = createAction({
    description: 'Archive a Linear cycle',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/archive-cycle',
        group: 'Cycles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin', 'cycles'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://studio.apollographql.com/public/Linear-API/variant/current/schema/reference/objects/CycleArchivePayload
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation CycleArchive($id: String!) {
                        cycleArchive(id: $id) {
                            success
                            entity {
                                id
                                name
                                archivedAt
                            }
                            lastSyncId
                        }
                    }
                `,
                variables: {
                    id: input.cycleId
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No response data from Linear API'
            });
        }

        const data = response.data;
        if (data.errors && data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: data.errors[0]?.message || 'GraphQL error occurred'
            });
        }

        const cycleArchive = data.data?.cycleArchive;
        if (!cycleArchive || !cycleArchive.success) {
            throw new nango.ActionError({
                type: 'archive_failed',
                message: 'Cycle archive operation failed',
                cycleId: input.cycleId
            });
        }

        const entity = cycleArchive.entity;
        if (!entity) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Cycle not found or was deleted',
                cycleId: input.cycleId
            });
        }

        return {
            id: entity.id,
            name: entity.name ?? null,
            archivedAt: entity.archivedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
