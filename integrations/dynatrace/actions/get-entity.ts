import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    entityId: z.string().describe('Entity ID. Example: "HOST-1234567890ABCDEF"')
});

const OutputSchema = z
    .object({
        entityId: z.string(),
        displayName: z.string().optional(),
        type: z.string().optional(),
        properties: z.record(z.string(), z.unknown()).optional(),
        tags: z.array(z.unknown()).optional(),
        fromRelationships: z.record(z.string(), z.unknown()).optional(),
        toRelationships: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get full details (properties, tags, relationships) for a single monitored entity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['entities.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api
        const response = await nango.get({
            endpoint: `api/v2/entities/${encodeURIComponent(input.entityId)}`,
            params: {
                fields: '+properties,+tags,+fromRelationships,+toRelationships'
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Entity not found or invalid response',
                entityId: input.entityId
            });
        }

        const providerEntity = OutputSchema.parse(response.data);
        return providerEntity;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
