import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const SchemaExtensionSchema = z.object({
    schema: z.string(),
    required: z.boolean()
});

const MetaSchema = z.object({
    resourceType: z.string().optional(),
    location: z.string().optional()
});

const ResourceTypeSchema = z.object({
    schemas: z.array(z.string()).optional(),
    id: z.string(),
    name: z.string(),
    endpoint: z.string(),
    description: z.string().optional(),
    schema: z.string(),
    schemaExtensions: z.array(SchemaExtensionSchema).optional(),
    meta: MetaSchema.optional()
});

const OutputSchema = z.object({
    schemas: z.array(z.string()).optional(),
    totalResults: z.number(),
    Resources: z.array(ResourceTypeSchema),
    startIndex: z.number().optional(),
    itemsPerPage: z.number().optional()
});

const action = createAction({
    description: 'List SCIM resource types',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-resource-types',
        group: 'SCIM'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['scim'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/ResourceTypes',
            retries: 3
        });

        const listResponse = OutputSchema.parse(response.data);

        return listResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
