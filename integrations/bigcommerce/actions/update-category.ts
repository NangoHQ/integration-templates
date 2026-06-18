import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.number().describe('The ID of the Category to update. Example: 1'),
    parent_id: z.number().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    views: z.number().optional(),
    sort_order: z.number().optional(),
    page_title: z.string().optional(),
    search_keywords: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    layout_file: z.string().optional(),
    is_visible: z.boolean().optional(),
    default_product_sort: z
        .enum(['use_store_settings', 'featured', 'newest', 'best_selling', 'alpha_asc', 'alpha_desc', 'avg_customer_review', 'price_asc', 'price_desc'])
        .optional(),
    image_url: z.string().optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional()
        })
        .optional()
});

const ProviderCustomUrlSchema = z.object({
    url: z.string().optional(),
    is_customized: z.boolean().optional()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    parent_id: z.number().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    views: z.number().optional(),
    sort_order: z.number().optional(),
    page_title: z.string().optional(),
    search_keywords: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    layout_file: z.string().optional(),
    is_visible: z.boolean().optional(),
    default_product_sort: z.string().optional(),
    image_url: z.string().optional(),
    custom_url: ProviderCustomUrlSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderCategorySchema,
    meta: z.object({}).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    parent_id: z.number().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    views: z.number().optional(),
    sort_order: z.number().optional(),
    page_title: z.string().optional(),
    search_keywords: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    layout_file: z.string().optional(),
    is_visible: z.boolean().optional(),
    default_product_sort: z.string().optional(),
    image_url: z.string().optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update a category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],
    endpoint: {
        path: '/actions/update-category',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.parent_id !== undefined) {
            data['parent_id'] = input.parent_id;
        }
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.views !== undefined) {
            data['views'] = input.views;
        }
        if (input.sort_order !== undefined) {
            data['sort_order'] = input.sort_order;
        }
        if (input.page_title !== undefined) {
            data['page_title'] = input.page_title;
        }
        if (input.search_keywords !== undefined) {
            data['search_keywords'] = input.search_keywords;
        }
        if (input.meta_keywords !== undefined) {
            data['meta_keywords'] = input.meta_keywords;
        }
        if (input.meta_description !== undefined) {
            data['meta_description'] = input.meta_description;
        }
        if (input.layout_file !== undefined) {
            data['layout_file'] = input.layout_file;
        }
        if (input.is_visible !== undefined) {
            data['is_visible'] = input.is_visible;
        }
        if (input.default_product_sort !== undefined) {
            data['default_product_sort'] = input.default_product_sort;
        }
        if (input.image_url !== undefined) {
            data['image_url'] = input.image_url;
        }
        if (input.custom_url !== undefined) {
            data['custom_url'] = input.custom_url;
        }

        const response = await nango.put({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/categories#update-a-category
            endpoint: `/v3/catalog/categories/${encodeURIComponent(input.category_id)}`,
            data,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Category with ID ${input.category_id} was not found.`
            });
        }

        if (response.status === 409) {
            throw new nango.ActionError({
                type: 'conflict',
                message: 'The category was in conflict with another category. This may be due to duplicate unique values such as name or custom_url.'
            });
        }

        if (response.status === 422) {
            throw new nango.ActionError({
                type: 'unprocessable_entity',
                message: 'The category was not valid. This may be due to missing required fields or invalid data.',
                details: response.data
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const category = parsed.data;

        return {
            id: category.id,
            ...(category.parent_id !== undefined && { parent_id: category.parent_id }),
            ...(category.name !== undefined && { name: category.name }),
            ...(category.description !== undefined && { description: category.description }),
            ...(category.views !== undefined && { views: category.views }),
            ...(category.sort_order !== undefined && { sort_order: category.sort_order }),
            ...(category.page_title !== undefined && { page_title: category.page_title }),
            ...(category.search_keywords !== undefined && { search_keywords: category.search_keywords }),
            ...(category.meta_keywords !== undefined && { meta_keywords: category.meta_keywords }),
            ...(category.meta_description !== undefined && { meta_description: category.meta_description }),
            ...(category.layout_file !== undefined && { layout_file: category.layout_file }),
            ...(category.is_visible !== undefined && { is_visible: category.is_visible }),
            ...(category.default_product_sort !== undefined && { default_product_sort: category.default_product_sort }),
            ...(category.image_url !== undefined && { image_url: category.image_url }),
            ...(category.custom_url !== undefined && { custom_url: category.custom_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
