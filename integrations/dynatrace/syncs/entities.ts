import { createSync } from 'nango';
import { z } from 'zod';

const ProviderEntitySchema = z.object({
    entityId: z.string(),
    displayName: z.string().optional(),
    type: z.string(),
    properties: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.unknown()).optional()
});

const EntityListResponseSchema = z.object({
    entities: z.array(z.unknown()),
    nextPageKey: z.string().optional(),
    pageSize: z.number().optional(),
    totalCount: z.number().optional()
});

const EntitySchema = z.object({
    id: z.string(),
    entityId: z.string(),
    displayName: z.string().optional(),
    type: z.string(),
    properties: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    entityTypeIndex: z.number(),
    nextPageKey: z.string()
});

const entityTypes = ['HOST', 'SERVICE', 'APPLICATION', 'PROCESS_GROUP'];

const sync = createSync({
    description: 'Sync monitored entities (hosts, services, applications, process groups) and their properties',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Entity: EntitySchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        if (!checkpoint) {
            await nango.trackDeletesStart('Entity');
        }

        let entityTypeIndex = checkpoint?.entityTypeIndex ?? 0;
        let nextPageKey = checkpoint?.nextPageKey || undefined;

        while (entityTypeIndex < entityTypes.length) {
            const entityType = entityTypes[entityTypeIndex];

            // Dynatrace requires nextPageKey to replace all other query params on subsequent pages,
            // which nango.paginate cannot do (it appends the cursor to existing params).
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
            while (true) {
                // https://docs.dynatrace.com/docs/dynatrace-api/environment-api
                const response = await nango.get({
                    endpoint: '/api/v2/entities',
                    params: nextPageKey
                        ? { nextPageKey }
                        : {
                              entitySelector: `type(${entityType})`,
                              fields: '+properties,+tags',
                              pageSize: 5
                          },
                    retries: 3
                });

                const listResponse = EntityListResponseSchema.parse(response.data);
                const entities = z.array(ProviderEntitySchema).parse(listResponse.entities);

                const records = entities.map((entity) => ({
                    id: entity.entityId,
                    entityId: entity.entityId,
                    displayName: entity.displayName,
                    type: entity.type,
                    ...(entity.properties !== undefined && { properties: entity.properties }),
                    ...(entity.tags !== undefined && { tags: entity.tags })
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'Entity');
                }

                const upcomingPageKey = listResponse.nextPageKey;
                const nextEntityTypeIndex = upcomingPageKey ? entityTypeIndex : entityTypeIndex + 1;

                if (upcomingPageKey || nextEntityTypeIndex < entityTypes.length) {
                    await nango.saveCheckpoint({
                        entityTypeIndex: nextEntityTypeIndex,
                        nextPageKey: upcomingPageKey ?? ''
                    });
                }

                nextPageKey = upcomingPageKey;
                if (!upcomingPageKey) {
                    entityTypeIndex = nextEntityTypeIndex;
                    nextPageKey = undefined;
                    break;
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Entity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
