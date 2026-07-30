import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        entityId: z.string().describe('Entity ID. Example: "9bb40d70-5e85-4894-b2fe-e945d9fb2f11"'),
        name: z.string().optional().describe('Updated name for the entity.'),
        properties: z.record(z.string(), z.unknown()).optional().describe('Properties to add or update on the entity.')
    })
    .refine((data) => data.name !== undefined || data.properties !== undefined, {
        message: 'At least one of "name" or "properties" must be provided.',
        path: ['name']
    });

const ProviderEntitySchema = z.object({
    id: z.string(),
    ironcladId: z.string(),
    name: z.string(),
    status: z.string(),
    lastUpdated: z.string(),
    properties: z.record(z.string(), z.unknown()).optional(),
    namedTypeIds: z.array(z.string()).optional(),
    parentId: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    ironcladId: z.string(),
    name: z.string(),
    status: z.string(),
    lastUpdated: z.string(),
    properties: z.record(z.string(), z.unknown()).optional(),
    namedTypeIds: z.array(z.string()).optional(),
    parentId: z.string().optional().nullable()
});

const action = createAction({
    description: "Update an entity's name or properties.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.entities.updateEntities'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developer.ironcladapp.com/reference/update-an-entity
            endpoint: `/public/api/v1/entities/${encodeURIComponent(input.entityId)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.properties !== undefined && { addProperties: input.properties })
            },
            retries: 3
        });

        const providerEntity = ProviderEntitySchema.parse(response.data);

        return {
            id: providerEntity.id,
            ironcladId: providerEntity.ironcladId,
            name: providerEntity.name,
            status: providerEntity.status,
            lastUpdated: providerEntity.lastUpdated,
            ...(providerEntity.properties !== undefined && { properties: providerEntity.properties }),
            ...(providerEntity.namedTypeIds !== undefined && { namedTypeIds: providerEntity.namedTypeIds }),
            ...(providerEntity.parentId != null && { parentId: providerEntity.parentId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
