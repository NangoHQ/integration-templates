import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object: z.string().describe('A UUID or slug to identify the object. Example: "people"')
});

const ProviderObjectIdSchema = z.object({
    workspace_id: z.string(),
    object_id: z.string()
});

const ProviderObjectSchema = z.object({
    id: ProviderObjectIdSchema,
    api_slug: z.string().nullable(),
    singular_noun: z.string().nullable(),
    plural_noun: z.string().nullable(),
    created_at: z.string()
});

const OutputSchema = z.object({
    id: ProviderObjectIdSchema,
    api_slug: z.string().optional(),
    singular_noun: z.string().optional(),
    plural_noun: z.string().optional(),
    created_at: z.string()
});

const action = createAction({
    description: 'Retrieve a single object from Attio.',
    version: '2.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-object',
        group: 'Objects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['object_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/rest-api/endpoint-reference/objects/get-an-object
        const response = await nango.get({
            endpoint: `/v2/objects/${encodeURIComponent(input.object)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Object with slug/ID "${input.object}" not found.`
            });
        }

        const providerObject = ProviderObjectSchema.parse(response.data.data);

        return {
            id: providerObject.id,
            ...(providerObject.api_slug != null && { api_slug: providerObject.api_slug }),
            ...(providerObject.singular_noun != null && { singular_noun: providerObject.singular_noun }),
            ...(providerObject.plural_noun != null && { plural_noun: providerObject.plural_noun }),
            created_at: providerObject.created_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
