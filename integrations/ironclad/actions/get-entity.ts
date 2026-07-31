import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    entityId: z.string().describe('Entity ID. Example: "9bb40d70-5e85-4894-b2fe-e945d9fb2f11"')
});

const ProviderEntitySchema = z
    .object({
        id: z.string(),
        ironcladId: z.string(),
        name: z.string(),
        status: z.string(),
        lastUpdated: z.string(),
        properties: z.record(z.string(), z.unknown()),
        namedTypeIds: z.array(z.string()).optional(),
        parentId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        ironcladId: z.string(),
        name: z.string(),
        status: z.string(),
        lastUpdated: z.string(),
        properties: z.record(z.string(), z.unknown()),
        namedTypeIds: z.array(z.string()).optional(),
        parentId: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get a single entity by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.entities.readEntities'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/retrieve-an-entity
            endpoint: `/public/api/v1/entities/${encodeURIComponent(input.entityId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Entity not found',
                entityId: input.entityId
            });
        }

        const providerEntity = ProviderEntitySchema.parse(response.data);

        return {
            id: providerEntity.id,
            ironcladId: providerEntity.ironcladId,
            name: providerEntity.name,
            status: providerEntity.status,
            lastUpdated: providerEntity.lastUpdated,
            properties: providerEntity.properties,
            ...(providerEntity.namedTypeIds !== undefined && { namedTypeIds: providerEntity.namedTypeIds }),
            ...(providerEntity.parentId !== undefined && { parentId: providerEntity.parentId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
