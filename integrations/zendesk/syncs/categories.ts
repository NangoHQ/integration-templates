import { createSync } from 'nango';
import { z } from 'zod';

const CategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    locale: z.string(),
    source_locale: z.string().optional(),
    position: z.number().int().optional(),
    outdated: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    html_url: z.string().optional(),
    url: z.string().optional()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullish(),
    locale: z.string(),
    source_locale: z.string().optional(),
    position: z.number().int().optional(),
    outdated: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    html_url: z.string().optional(),
    url: z.string().optional()
});

const CategoriesResponseSchema = z.object({
    categories: z.array(ProviderCategorySchema),
    meta: z
        .object({
            has_more: z.boolean().optional()
        })
        .optional(),
    links: z
        .object({
            next: z.string().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync Zendesk Help Center categories',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Category: CategorySchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/categories'
        }
    ],

    exec: async (nango) => {
        // Blocker: The Zendesk Help Center Categories API does not provide a changed-since
        // filter (modified_after or updated_after) to retrieve only changed records.
        // While the API supports sorting by updated_at, it cannot filter by it.
        // Therefore, a full refresh with trackDeletes is used.
        await nango.trackDeletesStart('Category');

        // https://developer.zendesk.com/api-reference/help_center/help-center-api/categories/#list-categories
        const proxyConfig: {
            endpoint: string;
            params: { sort_by: string; sort_order: string };
            paginate: {
                type: 'cursor';
                cursor_name_in_request: string;
                cursor_path_in_response: string;
                response_path: string;
                limit_name_in_request: string;
                limit: number;
            };
            retries: number;
        } = {
            endpoint: '/api/v2/help_center/categories',
            params: {
                sort_by: 'updated_at',
                sort_order: 'asc'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page[after]',
                cursor_path_in_response: 'links.next',
                response_path: 'categories',
                limit_name_in_request: 'page[size]',
                limit: 100
            },
            retries: 3
        };

        try {
            for await (const page of nango.paginate(proxyConfig)) {
                const validated = CategoriesResponseSchema.safeParse({ categories: page });
                if (!validated.success) {
                    throw new Error(`Failed to validate categories: ${validated.error.message}`);
                }

                const categories = validated.data.categories.map((category) => ({
                    id: String(category.id),
                    name: category.name,
                    ...(category.description != null && { description: category.description }),
                    locale: category.locale,
                    ...(category.source_locale != null && { source_locale: category.source_locale }),
                    ...(category.position != null && { position: category.position }),
                    ...(category.outdated != null && { outdated: category.outdated }),
                    created_at: category.created_at,
                    updated_at: category.updated_at,
                    ...(category.html_url != null && { html_url: category.html_url }),
                    ...(category.url != null && { url: category.url })
                }));

                if (categories.length > 0) {
                    await nango.batchSave(categories, 'Category');
                }
            }
        } finally {
            await nango.trackDeletesEnd('Category');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
