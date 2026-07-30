import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('The name of the entity. Example: "Acme Inc."'),
    relationshipTypeKey: z.array(z.string()).optional().describe('Relationship type keys to assign to the entity. Example: ["customer"]'),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional().describe('The status of the entity. Defaults to ACTIVE.'),
    properties: z.record(z.string(), z.unknown()).optional().describe('A map of entity properties to set.'),
    parentRecordId: z.string().optional().describe('The record ID of the parent entity.')
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
    description: 'Create a new entity (e.g. a counterparty company, customer, vendor, or partner record).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.entities.createEntities'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            name: input.name
        };

        if (input.relationshipTypeKey !== undefined) {
            requestBody['relationshipTypeKey'] = input.relationshipTypeKey;
        }

        if (input.status !== undefined) {
            requestBody['status'] = input.status;
        }

        if (input.properties !== undefined) {
            requestBody['properties'] = input.properties;
        }

        if (input.parentRecordId !== undefined) {
            requestBody['parent'] = { recordId: input.parentRecordId };
        }

        // https://developer.ironcladapp.com/reference/create-an-entity
        const response = await nango.post({
            endpoint: '/public/api/v1/entities',
            data: requestBody,
            retries: 1
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
