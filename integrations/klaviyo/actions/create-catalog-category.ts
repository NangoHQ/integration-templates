import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    external_id: z.string().describe('Unique external ID for the category. Example: "nango-test-category-1"'),
    name: z.string().describe('Display name of the category. Example: "Nango Test Category"'),
    catalog_type: z.string().optional().describe('Catalog type. Defaults to "$default".'),
    integration_type: z.string().optional().describe('Integration type. Defaults to "$custom".')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            type: z.string(),
            id: z.string(),
            attributes: z
                .object({
                    external_id: z.string(),
                    name: z.string(),
                    catalog_type: z.string().optional(),
                    integration_type: z.string().optional()
                })
                .passthrough()
        })
        .passthrough()
});

const OutputSchema = z.object({
    id: z.string().describe('Klaviyo catalog category ID. Example: "$custom:::$default:::nango-test-category-1"'),
    external_id: z.string(),
    name: z.string(),
    catalog_type: z.string().optional(),
    integration_type: z.string().optional()
});

const action = createAction({
    description: 'Create a catalog category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/create_catalog_category
            endpoint: '/api/catalog-categories',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'catalog-category',
                    attributes: {
                        external_id: input.external_id,
                        name: input.name,
                        catalog_type: input.catalog_type ?? '$default',
                        integration_type: input.integration_type ?? '$custom'
                    }
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.data.id,
            external_id: providerResponse.data.attributes.external_id,
            name: providerResponse.data.attributes.name,
            ...(providerResponse.data.attributes.catalog_type !== undefined && { catalog_type: providerResponse.data.attributes.catalog_type }),
            ...(providerResponse.data.attributes.integration_type !== undefined && { integration_type: providerResponse.data.attributes.integration_type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
