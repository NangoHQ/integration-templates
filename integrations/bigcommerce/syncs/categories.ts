import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCategorySchema = z.object({
    id: z.number(),
    parent_id: z.number().optional(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    views: z.number().optional(),
    sort_order: z.number().optional(),
    page_title: z.string().nullable().optional(),
    meta_keywords: z.array(z.string()).nullable().optional(),
    meta_description: z.string().nullable().optional(),
    layout_file: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    is_visible: z.boolean().optional(),
    search_keywords: z.string().nullable().optional(),
    default_product_sort: z.string().nullable().optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional()
        })
        .nullable()
        .optional(),
    url: z.string().optional()
});

const CategorySchema = z.object({
    id: z.string(),
    parent_id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    views: z.number().optional(),
    sort_order: z.number().optional(),
    page_title: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    layout_file: z.string().optional(),
    image_url: z.string().optional(),
    is_visible: z.boolean().optional(),
    search_keywords: z.string().optional(),
    default_product_sort: z.string().optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional()
        })
        .optional(),
    url: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync categories.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Category: CategorySchema
    },
    // https://developer.bigcommerce.com/docs/rest-management/catalog/categories#get-all-categories
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/categories'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { page: 1 });
        let page: number | undefined = checkpoint.page;

        await nango.trackDeletesStart('Category');

        // https://developer.bigcommerce.com/docs/rest-management/catalog/categories#get-all-categories
        const proxyConfig: ProxyConfiguration = {
            // https://developer.bigcommerce.com/docs/rest-management/catalog/categories#get-all-categories
            endpoint: '/v3/catalog/categories',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'data',
                on_page: async (state) => {
                    page = typeof state.nextPageParam === 'number' ? state.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const items of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderCategorySchema).safeParse(items);
            if (!parsed.success) {
                throw new Error(`Failed to parse categories: ${parsed.error.message}`);
            }

            const categories = parsed.data.map((record) => ({
                id: String(record.id),
                ...(record.parent_id !== undefined && { parent_id: String(record.parent_id) }),
                ...(record.name !== undefined && { name: record.name }),
                ...(record.description !== undefined && record.description !== null && { description: record.description }),
                ...(record.views !== undefined && { views: record.views }),
                ...(record.sort_order !== undefined && { sort_order: record.sort_order }),
                ...(record.page_title !== undefined && record.page_title !== null && { page_title: record.page_title }),
                ...(record.meta_keywords !== undefined && record.meta_keywords !== null && { meta_keywords: record.meta_keywords }),
                ...(record.meta_description !== undefined && record.meta_description !== null && { meta_description: record.meta_description }),
                ...(record.layout_file !== undefined && record.layout_file !== null && { layout_file: record.layout_file }),
                ...(record.image_url !== undefined && record.image_url !== null && { image_url: record.image_url }),
                ...(record.is_visible !== undefined && { is_visible: record.is_visible }),
                ...(record.search_keywords !== undefined && record.search_keywords !== null && { search_keywords: record.search_keywords }),
                ...(record.default_product_sort !== undefined && record.default_product_sort !== null && { default_product_sort: record.default_product_sort }),
                ...(record.custom_url !== undefined && record.custom_url !== null && { custom_url: record.custom_url }),
                ...(record.url !== undefined && { url: record.url })
            }));

            if (categories.length > 0) {
                await nango.batchSave(categories, 'Category');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.trackDeletesEnd('Category');
        await nango.saveCheckpoint({ page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
