import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    // No input required for listing objects
});

const AttioObjectIdSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid()
});

const AttioObjectSchema = z.object({
    id: AttioObjectIdSchema,
    api_slug: z.string().nullable(),
    singular_noun: z.string().nullable(),
    plural_noun: z.string().nullable(),
    created_at: z.string()
});

const AttioListObjectsResponseSchema = z.object({
    data: z.array(AttioObjectSchema)
});

const ObjectOutputSchema = z.object({
    workspace_id: z.string().uuid(),
    object_id: z.string().uuid(),
    api_slug: z.string().optional(),
    singular_noun: z.string().optional(),
    plural_noun: z.string().optional(),
    created_at: z.string()
});

const OutputSchema = z.object({
    objects: z.array(ObjectOutputSchema)
});

const action = createAction({
    description: 'List objects from Attio.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['object_configuration:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.attio.com/rest-api/objects
            endpoint: '/v2/objects',
            retries: 3
        });

        const parsedResponse = AttioListObjectsResponseSchema.parse(response.data);

        return {
            objects: parsedResponse.data.map((obj) => ({
                workspace_id: obj.id.workspace_id,
                object_id: obj.id.object_id,
                ...(obj.api_slug != null && { api_slug: obj.api_slug }),
                ...(obj.singular_noun != null && { singular_noun: obj.singular_noun }),
                ...(obj.plural_noun != null && { plural_noun: obj.plural_noun }),
                created_at: obj.created_at
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
