import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const SchemaAttributeSchema = z.object({
    name: z.string(),
    type: z.string().optional(),
    multiValued: z.boolean().optional(),
    required: z.boolean().optional(),
    mutability: z.string().optional(),
    returned: z.string().optional(),
    uniqueness: z.string().optional(),
    description: z.string().optional(),
    subAttributes: z
        .array(
            z.object({
                name: z.string(),
                type: z.string().optional(),
                multiValued: z.boolean().optional(),
                required: z.boolean().optional(),
                mutability: z.string().optional(),
                returned: z.string().optional(),
                uniqueness: z.string().optional(),
                description: z.string().optional()
            })
        )
        .optional()
});

const ProviderSchemaSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    attributes: z.array(SchemaAttributeSchema).optional()
});

const ProviderListResponseSchema = z.object({
    schemas: z.array(z.string()).optional(),
    totalResults: z.number().optional(),
    Resources: z.array(ProviderSchemaSchema).optional(),
    startIndex: z.number().optional(),
    itemsPerPage: z.number().optional()
});

const OutputSchema = z.object({
    schemas: z.array(ProviderSchemaSchema).optional()
});

const action = createAction({
    description: 'List SCIM schemas supported by the bridge.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-schemas',
        group: 'SCIM'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://support.1password.com/scim-endpoints/
            endpoint: '/Schemas',
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);

        return {
            schemas: listResponse.Resources
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
