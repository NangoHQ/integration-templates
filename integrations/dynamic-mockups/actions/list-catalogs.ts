import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const CatalogSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    type: z.string(),
    created_at: z.string().optional(),
    created_at_timestamp: z.number().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(CatalogSchema)
});

const OutputSchema = z.array(CatalogSchema);

const action = createAction({
    description: 'List catalogs (top-level containers that scope mockups/collections; every workspace has at least a Default catalog).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynamicmockups.com/
        const response = await nango.get({
            endpoint: '/v1/catalogs',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return providerResponse.data.map((catalog) => ({
            uuid: catalog.uuid,
            name: catalog.name,
            type: catalog.type,
            ...(catalog.created_at != null && { created_at: catalog.created_at }),
            ...(catalog.created_at_timestamp != null && { created_at_timestamp: catalog.created_at_timestamp })
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
