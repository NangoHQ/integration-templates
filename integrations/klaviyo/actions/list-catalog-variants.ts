import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    item_id: z.string().optional().describe('Filter by the parent catalog item ID. Example: "$custom:::$default:::nango-seed-item-1"'),
    sku: z.string().optional().describe('Filter by SKU (exact match).'),
    title: z.string().optional().describe('Filter by title (contains).'),
    published: z.boolean().optional().describe('Filter by published status (exact match).'),
    page_size: z.number().min(1).max(100).optional().describe('Number of results per page. Default: 100. Min: 1. Max: 100.'),
    sort: z.enum(['created', '-created']).optional().describe('Sort order. Use "created" for ascending or "-created" for descending.')
});

const ProviderVariantSchema = z.object({
    type: z.literal('catalog-variant'),
    id: z.string(),
    attributes: z.object({
        external_id: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        sku: z.string().nullable().optional(),
        inventory_policy: z.number().nullable().optional(),
        inventory_quantity: z.number().nullable().optional(),
        price: z.number().nullable().optional(),
        url: z.string().nullable().optional(),
        image_full_url: z.string().nullable().optional(),
        image_thumbnail_url: z.string().nullable().optional(),
        images: z.array(z.string()).nullable().optional(),
        custom_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
        published: z.boolean().nullable().optional(),
        created: z.string().nullable().optional(),
        updated: z.string().nullable().optional()
    }),
    relationships: z
        .object({
            item: z.object({
                data: z
                    .object({
                        type: z.literal('catalog-item'),
                        id: z.string()
                    })
                    .optional()
            })
        })
        .optional(),
    links: z.object({
        self: z.string()
    })
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderVariantSchema),
    links: z.object({
        self: z.string(),
        prev: z.string().nullable().optional(),
        next: z.string().nullable().optional()
    })
});

const OutputItemSchema = z.object({
    id: z.string(),
    external_id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    sku: z.string().optional(),
    inventory_policy: z.number().optional(),
    inventory_quantity: z.number().optional(),
    price: z.number().optional(),
    url: z.string().optional(),
    image_full_url: z.string().optional(),
    image_thumbnail_url: z.string().optional(),
    images: z.array(z.string()).optional(),
    custom_metadata: z.record(z.string(), z.unknown()).optional(),
    published: z.boolean().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    item_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

function extractCursor(nextUrl: string | null | undefined): string | undefined {
    if (!nextUrl) {
        return undefined;
    }
    const url = new URL(nextUrl);
    const cursor = url.searchParams.get('page[cursor]');
    return cursor ?? undefined;
}

function buildFilter(input: z.infer<typeof InputSchema>): string | undefined {
    const filters: string[] = [];
    if (input.item_id !== undefined) {
        filters.push(`equals(item.id,"${input.item_id}")`);
    }
    if (input.sku !== undefined) {
        filters.push(`equals(sku,"${input.sku}")`);
    }
    if (input.title !== undefined) {
        filters.push(`contains(title,"${input.title}")`);
    }
    if (input.published !== undefined) {
        filters.push(`equals(published,${input.published})`);
    }
    if (filters.length === 0) {
        return undefined;
    }
    if (filters.length === 1) {
        return filters[0];
    }
    return filters.join(',');
}

const action = createAction({
    description: 'List catalog item variants.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['catalogs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filter = buildFilter(input);
        const params: Record<string, string | number> = {};
        if (filter !== undefined) {
            params['filter'] = filter;
        }
        if (input.cursor !== undefined) {
            params['page[cursor]'] = input.cursor;
        }
        if (input.page_size !== undefined) {
            params['page[size]'] = input.page_size;
        }
        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }

        // https://developers.klaviyo.com/en/reference/get_catalog_variants
        const response = await nango.get({
            endpoint: '/api/catalog-variants',
            params,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((variant) => {
            const attrs = variant.attributes;
            return {
                id: variant.id,
                ...(attrs.external_id != null && { external_id: attrs.external_id }),
                ...(attrs.title != null && { title: attrs.title }),
                ...(attrs.description != null && { description: attrs.description }),
                ...(attrs.sku != null && { sku: attrs.sku }),
                ...(attrs.inventory_policy != null && { inventory_policy: attrs.inventory_policy }),
                ...(attrs.inventory_quantity != null && { inventory_quantity: attrs.inventory_quantity }),
                ...(attrs.price != null && { price: attrs.price }),
                ...(attrs.url != null && { url: attrs.url }),
                ...(attrs.image_full_url != null && { image_full_url: attrs.image_full_url }),
                ...(attrs.image_thumbnail_url != null && { image_thumbnail_url: attrs.image_thumbnail_url }),
                ...(attrs.images != null && { images: attrs.images }),
                ...(attrs.custom_metadata != null && { custom_metadata: attrs.custom_metadata }),
                ...(attrs.published != null && { published: attrs.published }),
                ...(attrs.created != null && { created: attrs.created }),
                ...(attrs.updated != null && { updated: attrs.updated }),
                ...(variant.relationships?.item?.data?.id != null && { item_id: variant.relationships.item.data.id })
            };
        });

        const next_cursor = extractCursor(providerResponse.links.next);

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
