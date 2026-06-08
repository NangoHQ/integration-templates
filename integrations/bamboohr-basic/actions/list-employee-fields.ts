import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderFieldSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    type: z.string().optional(),
    deprecated: z.union([z.boolean(), z.string()]).optional()
});

const ProviderResponseSchema = z.array(ProviderFieldSchema);

const FieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    deprecated: z.boolean().optional()
});

const OutputSchema = z.object({
    fields: z.array(FieldSchema)
});

const action = createAction({
    description: 'List available BambooHR employee fields.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-employee-fields',
        group: 'Employees'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-fields
            endpoint: '/v1/meta/fields',
            headers: {
                Accept: 'application/json'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            fields: providerResponse.map((field) => ({
                id: String(field.id),
                name: field.name,
                ...(field.type !== undefined && { type: field.type }),
                ...(field.deprecated !== undefined && {
                    deprecated: typeof field.deprecated === 'string' ? field.deprecated === 'yes' || field.deprecated === 'true' : field.deprecated
                })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
