import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ResourceTypeMetaSchema = z.object({
    resourceType: z.string().optional(),
    location: z.string().optional()
});

const SchemaExtensionSchema = z.object({
    schema: z.string().optional(),
    required: z.boolean().optional()
});

const ResourceTypeSchema = z.object({
    schemas: z.array(z.string()).optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    endpoint: z.string().optional(),
    schema: z.string().optional(),
    schemaExtensions: z.array(SchemaExtensionSchema).optional(),
    meta: ResourceTypeMetaSchema.optional()
});

const OutputSchema = z.object({
    schemas: z.array(z.string()).optional(),
    totalResults: z.number().optional(),
    itemsPerPage: z.number().optional(),
    startIndex: z.number().optional(),
    Resources: z.array(ResourceTypeSchema).optional()
});

const action = createAction({
    description: 'List SCIM resource types.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-resource-types',
        group: 'SCIM'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/ResourceTypes',
            retries: 3
        });

        const providerData = OutputSchema.parse(response.data);

        return {
            ...(providerData.schemas !== undefined && { schemas: providerData.schemas }),
            ...(providerData.totalResults !== undefined && { totalResults: providerData.totalResults }),
            ...(providerData.itemsPerPage !== undefined && { itemsPerPage: providerData.itemsPerPage }),
            ...(providerData.startIndex !== undefined && { startIndex: providerData.startIndex }),
            ...(providerData.Resources !== undefined && { Resources: providerData.Resources })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
