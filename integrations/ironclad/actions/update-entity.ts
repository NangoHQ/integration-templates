import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    entityId: z.string().describe('Entity ID. Example: "9bb40d70-5e85-4894-b2fe-e945d9fb2f11"'),
    name: z.string().optional().describe('Updated name for the entity.'),
    properties: z.record(z.string(), z.unknown()).optional().describe('Updated properties for the entity.')
});

const ProviderEntitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
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
                ...(input.properties !== undefined && { properties: input.properties })
            },
            retries: 3
        });

        const providerEntity = ProviderEntitySchema.parse(response.data);

        return {
            id: providerEntity.id,
            ...(providerEntity.name !== undefined && { name: providerEntity.name }),
            ...(providerEntity.type !== undefined && { type: providerEntity.type }),
            ...(providerEntity.properties !== undefined && { properties: providerEntity.properties }),
            ...(providerEntity.created_at !== undefined && { created_at: providerEntity.created_at }),
            ...(providerEntity.updated_at !== undefined && { updated_at: providerEntity.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
