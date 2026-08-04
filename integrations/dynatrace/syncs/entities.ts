import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderEntitySchema = z
    .object({
        entityId: z.string(),
        type: z.string(),
        displayName: z.string().nullish(),
        properties: z.record(z.string(), z.unknown()).nullish(),
        tags: z.array(z.record(z.string(), z.unknown())).nullish()
    })
    .passthrough();

const EntityListResponseSchema = z.object({
    entities: z.array(ProviderEntitySchema),
    nextPageKey: z.string().optional(),
    totalCount: z.number().optional(),
    pageSize: z.number().optional()
});

const EntitySchema = z.object({
    id: z.string(),
    entityId: z.string(),
    type: z.string(),
    displayName: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.record(z.string(), z.unknown())).optional()
});

const sync = createSync({
    description: 'Sync monitored entities (hosts, services, applications, process groups) and their properties.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Entity: EntitySchema
    },

    exec: async (nango) => {
        const entityTypes = ['HOST', 'SERVICE', 'APPLICATION', 'PROCESS_GROUP'];

        await nango.trackDeletesStart('Entity');

        for (const entityType of entityTypes) {
            let nextPageKey: string | undefined;

            do {
                const params: Record<string, string | number> = nextPageKey
                    ? { nextPageKey }
                    : {
                          entitySelector: `type(${entityType})`,
                          fields: '+properties,+tags',
                          pageSize: 100
                      };

                const config: ProxyConfiguration = {
                    // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/entities/get-entities
                    endpoint: '/api/v2/entities',
                    params,
                    retries: 3
                };

                const response = await nango.get(config);

                const parsed = EntityListResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse entities response for ${entityType}: ${parsed.error.message}`);
                }

                const { entities, nextPageKey: nextKey } = parsed.data;

                if (entities.length > 0) {
                    const mapped = entities.map((entity) => ({
                        id: entity.entityId,
                        entityId: entity.entityId,
                        type: entity.type,
                        ...(entity.displayName != null && { displayName: entity.displayName }),
                        ...(entity.properties != null && { properties: entity.properties }),
                        ...(entity.tags != null && { tags: entity.tags })
                    }));

                    await nango.batchSave(mapped, 'Entity');
                }

                nextPageKey = nextKey;
            } while (nextPageKey);
        }

        await nango.trackDeletesEnd('Entity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
