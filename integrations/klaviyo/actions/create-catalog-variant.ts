import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('Parent catalog item ID. Example: "$custom:::$default:::item-123"'),
    external_id: z.string().describe('Unique external ID for the variant. Example: "variant-123"'),
    title: z.string().describe('Title of the variant. Example: "Small Red Shirt"'),
    description: z.string().describe('Description of the variant. Required even though optional on parent items. Example: "A small red cotton shirt."'),
    url: z.string().describe('URL for the variant. Required even though optional on parent items. Example: "https://example.com/products/red-shirt"'),
    sku: z.string().optional().describe('Stock keeping unit. Example: "SKU-123-RED-S"'),
    price: z.number().optional().describe('Price of the variant. Example: 29.99'),
    inventory_policy: z.number().optional().describe('Inventory policy value. Example: 0'),
    inventory_quantity: z.number().optional().describe('Available inventory quantity. Example: 100'),
    published: z.boolean().optional().describe('Whether the variant is published. Example: true')
});

const ProviderCatalogVariantSchema = z.object({
    data: z
        .object({
            type: z.string(),
            id: z.string(),
            attributes: z
                .object({
                    external_id: z.string().optional(),
                    catalog_type: z.string().optional(),
                    integration_type: z.string().optional(),
                    title: z.string().optional(),
                    description: z.string().optional(),
                    sku: z.string().optional(),
                    url: z.string().optional(),
                    price: z.number().optional(),
                    inventory_policy: z.number().optional(),
                    inventory_quantity: z.number().optional(),
                    published: z.boolean().optional()
                })
                .optional(),
            relationships: z
                .object({
                    item: z
                        .object({
                            data: z
                                .object({
                                    type: z.string(),
                                    id: z.string()
                                })
                                .optional()
                        })
                        .optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    external_id: z.string().optional(),
    catalog_type: z.string().optional(),
    integration_type: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    sku: z.string().optional(),
    url: z.string().optional(),
    price: z.number().optional(),
    inventory_policy: z.number().optional(),
    inventory_quantity: z.number().optional(),
    published: z.boolean().optional(),
    item_id: z.string().optional()
});

const action = createAction({
    description: 'Create a variant of a catalog item.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody = {
            data: {
                type: 'catalog-variant',
                attributes: {
                    external_id: input.external_id,
                    catalog_type: '$default',
                    integration_type: '$custom',
                    title: input.title,
                    description: input.description,
                    url: input.url,
                    ...(input.sku !== undefined && { sku: input.sku }),
                    ...(input.price !== undefined && { price: input.price }),
                    ...(input.inventory_policy !== undefined && { inventory_policy: input.inventory_policy }),
                    ...(input.inventory_quantity !== undefined && { inventory_quantity: input.inventory_quantity }),
                    ...(input.published !== undefined && { published: input.published })
                },
                relationships: {
                    item: {
                        data: {
                            type: 'catalog-item',
                            id: input.item_id
                        }
                    }
                }
            }
        };

        // https://developers.klaviyo.com/en/reference/create_catalog_variant
        const response = await nango.post({
            endpoint: '/api/catalog-variants',
            data: requestBody,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsed = ProviderCatalogVariantSchema.parse(response.data);

        if (!parsed.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response body.'
            });
        }

        const variant = parsed.data;
        const attributes = variant.attributes;
        const itemRelationship = variant.relationships?.item?.data;

        return {
            id: variant.id,
            type: variant.type,
            ...(attributes?.external_id !== undefined && { external_id: attributes.external_id }),
            ...(attributes?.catalog_type !== undefined && { catalog_type: attributes.catalog_type }),
            ...(attributes?.integration_type !== undefined && { integration_type: attributes.integration_type }),
            ...(attributes?.title !== undefined && { title: attributes.title }),
            ...(attributes?.description !== undefined && { description: attributes.description }),
            ...(attributes?.sku !== undefined && { sku: attributes.sku }),
            ...(attributes?.url !== undefined && { url: attributes.url }),
            ...(attributes?.price !== undefined && { price: attributes.price }),
            ...(attributes?.inventory_policy !== undefined && { inventory_policy: attributes.inventory_policy }),
            ...(attributes?.inventory_quantity !== undefined && { inventory_quantity: attributes.inventory_quantity }),
            ...(attributes?.published !== undefined && { published: attributes.published }),
            ...(itemRelationship?.id !== undefined && { item_id: itemRelationship.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
