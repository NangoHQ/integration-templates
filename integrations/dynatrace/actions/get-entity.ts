import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    entityId: z.string().describe('Dynatrace entity ID. Example: "HOST-15FE58391F97B7AA"')
});

const TagSchema = z.object({
    context: z.string(),
    key: z.string(),
    value: z.string().optional(),
    stringRepresentation: z.string(),
    source: z.string(),
    sourceSetting: z.string().optional()
});

const IconSchema = z.object({
    primaryIconType: z.string(),
    secondaryIconType: z.string().optional()
});

const RelationshipTargetSchema = z.object({
    id: z.string(),
    type: z.string()
});

const OutputSchema = z.object({
    entityId: z.string(),
    type: z.string(),
    displayName: z.string(),
    firstSeenTms: z.number().optional(),
    lastSeenTms: z.number().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    tags: TagSchema.array().optional(),
    managementZones: z.unknown().array().optional(),
    icon: IconSchema.optional(),
    fromRelationships: z.record(z.string(), RelationshipTargetSchema.array()).optional(),
    toRelationships: z.record(z.string(), RelationshipTargetSchema.array()).optional()
});

const action = createAction({
    description: 'Get full details (properties, tags, relationships) for a single monitored entity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['entities.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api
        const response = await nango.get({
            endpoint: `/api/v2/entities/${encodeURIComponent(input.entityId)}`,
            params: {
                fields: '+properties,+tags,+fromRelationships,+toRelationships'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Entity not found',
                entityId: input.entityId
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
