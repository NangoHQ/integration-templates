import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter: z.string().optional().describe('Filter query string. Example: equals(published,true)'),
    sort: z.string().optional().describe('Sort order. Example: created or -created'),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of items per page. Default: 100, Min: 1, Max: 100.')
});

const CatalogItemAttributesSchema = z
    .object({
        external_id: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional(),
        published: z.boolean().optional(),
        created: z.string().optional(),
        updated: z.string().optional()
    })
    .passthrough();

const CatalogItemSchema = z
    .object({
        type: z.string(),
        id: z.string(),
        attributes: CatalogItemAttributesSchema.optional(),
        relationships: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ResponseSchema = z.object({
    data: z.array(CatalogItemSchema),
    links: z
        .object({
            next: z.string().nullable().optional(),
            prev: z.string().nullable().optional(),
            self: z.string().optional()
        })
        .optional()
});

const OutputItemSchema = z.object({
    id: z.string(),
    external_id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    published: z.boolean().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List catalog items.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['catalogs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_catalog_items
            endpoint: '/api/catalog-items',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.page_size !== undefined && { 'page[size]': input.page_size })
            },
            retries: 3,
            headers: {
                revision: '2026-04-15'
            }
        });

        const parsed = ResponseSchema.parse(response.data);

        const items = parsed.data.map((item) => {
            const attrs = item.attributes || {};
            return {
                id: item.id,
                ...(attrs.external_id !== undefined && { external_id: attrs.external_id }),
                ...(attrs.title !== undefined && { title: attrs.title }),
                ...(attrs.description !== undefined && { description: attrs.description }),
                ...(attrs.url !== undefined && { url: attrs.url }),
                ...(attrs.published !== undefined && { published: attrs.published }),
                ...(attrs.created !== undefined && { created: attrs.created }),
                ...(attrs.updated !== undefined && { updated: attrs.updated })
            };
        });

        let next_cursor: string | undefined;
        const nextUrl = parsed.links?.next;
        if (typeof nextUrl === 'string') {
            const url = new URL(nextUrl);
            next_cursor = url.searchParams.get('page[cursor]') || undefined;
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
