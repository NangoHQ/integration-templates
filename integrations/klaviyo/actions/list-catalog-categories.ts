import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const CategorySchema = z.object({
    id: z.string(),
    external_id: z.string().optional(),
    name: z.string().optional(),
    updated: z.string().optional()
});

const OutputSchema = z.object({
    categories: z.array(CategorySchema),
    next_cursor: z.string().optional()
});

const ProviderCategorySchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: z
        .object({
            external_id: z.string().optional().nullable(),
            name: z.string().optional().nullable(),
            updated: z.string().optional().nullable()
        })
        .optional(),
    relationships: z
        .object({
            items: z
                .object({
                    data: z
                        .array(
                            z.object({
                                type: z.string(),
                                id: z.string()
                            })
                        )
                        .optional()
                })
                .optional()
        })
        .optional(),
    links: z
        .object({
            self: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderCategorySchema),
    links: z
        .object({
            self: z.string().optional().nullable(),
            next: z.string().optional().nullable(),
            prev: z.string().optional().nullable()
        })
        .optional()
});

const action = createAction({
    description: 'List catalog categories.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['catalogs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_catalog_categories
            endpoint: '/api/catalog-categories',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const categories = providerResponse.data.map((item) => {
            const attrs = item.attributes;
            return {
                id: item.id,
                ...(attrs?.external_id != null && { external_id: attrs.external_id }),
                ...(attrs?.name != null && { name: attrs.name }),
                ...(attrs?.updated != null && { updated: attrs.updated })
            };
        });

        let next_cursor: string | undefined;
        const nextLink = providerResponse.links?.next;
        if (typeof nextLink === 'string') {
            const url = new URL(nextLink);
            const cursor = url.searchParams.get('page[cursor]');
            if (cursor) {
                next_cursor = cursor;
            }
        }

        return {
            categories,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
