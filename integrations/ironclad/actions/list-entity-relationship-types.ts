import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderPropertySchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        type: z.unknown().optional(),
        description: z.string().optional(),
        required: z.boolean().optional(),
        defaultValue: z.unknown().optional(),
        options: z.array(z.unknown()).optional()
    })
    .passthrough();

const ProviderRelationshipTypeSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        properties: z.record(z.string(), ProviderPropertySchema).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.array(ProviderRelationshipTypeSchema);

const OutputPropertySchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.unknown().optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    default_value: z.unknown().optional(),
    options: z.array(z.unknown()).optional()
});

const OutputRelationshipTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    properties: z.array(OutputPropertySchema).optional()
});

const OutputSchema = z.object({
    relationship_types: z.array(OutputRelationshipTypeSchema)
});

const action = createAction({
    description: 'List the entity type schemas configured in this tenant with their property definitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.entities.readRelationshipTypes'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/
            endpoint: '/public/api/v1/entities/relationship-types',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const relationship_types = providerResponse.map((rt) => {
            const rawProperties = rt.properties ?? {};
            const properties = Object.entries(rawProperties).map(([_key, prop]) => {
                return {
                    id: prop.id ?? _key,
                    name: prop.name ?? _key,
                    ...(prop.type !== undefined && { type: prop.type }),
                    ...(prop.description !== undefined && { description: prop.description }),
                    ...(prop.required !== undefined && { required: prop.required }),
                    ...(prop.defaultValue !== undefined && { default_value: prop.defaultValue }),
                    ...(prop.options !== undefined && { options: prop.options })
                };
            });

            return {
                id: rt.id,
                name: rt.name,
                ...(properties.length > 0 && { properties })
            };
        });

        return {
            relationship_types
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
