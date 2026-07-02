import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    external_id: z.string().describe("Catalog item external_id. Example: 'nango-test-item-1'"),
    title: z.string().describe("Catalog item title. Example: 'Nango Test Item'"),
    description: z.string().optional().describe('Catalog item description.'),
    price: z.number().optional().describe('Catalog item price.'),
    url: z.string().optional().describe('Catalog item URL.'),
    catalog_type: z.string().optional().describe("Catalog type. Defaults to '$default'."),
    integration_type: z.string().optional().describe("Integration type. Defaults to '$custom'.")
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z
            .object({
                external_id: z.string(),
                title: z.string(),
                description: z.string().optional(),
                price: z.number().optional(),
                url: z.string().optional(),
                catalog_type: z.string().optional(),
                integration_type: z.string().optional()
            })
            .passthrough()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    external_id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    price: z.number().optional(),
    url: z.string().optional(),
    catalog_type: z.string(),
    integration_type: z.string()
});

const action = createAction({
    description: 'Create a catalog item (product).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['catalogs:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const catalogType = input.catalog_type ?? '$default';
        const integrationType = input.integration_type ?? '$custom';

        const body = {
            data: {
                type: 'catalog-item',
                attributes: {
                    external_id: input.external_id,
                    title: input.title,
                    catalog_type: catalogType,
                    integration_type: integrationType,
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.price !== undefined && { price: input.price }),
                    ...(input.url !== undefined && { url: input.url })
                }
            }
        };

        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/create_catalog_item
            endpoint: '/api/catalog-items',
            data: body,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const item = parsed.data.data;
        const attrs = item.attributes;

        return {
            id: item.id,
            external_id: attrs.external_id,
            title: attrs.title,
            ...(attrs.description !== undefined && { description: attrs.description }),
            ...(attrs.price !== undefined && { price: attrs.price }),
            ...(attrs.url !== undefined && { url: attrs.url }),
            catalog_type: attrs.catalog_type ?? catalogType,
            integration_type: attrs.integration_type ?? integrationType
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
