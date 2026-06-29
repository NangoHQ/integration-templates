import { z } from 'zod';
import { createAction } from 'nango';

const CustomUrlSchema = z.object({
    url: z.string().optional(),
    is_customized: z.boolean().optional()
});

const InputSchema = z.object({
    parent_id: z.number().describe("The unique numeric ID of the category's parent. Set to 0 for a top-level category. Example: 0"),
    name: z.string().describe('The name displayed for the category. Example: "Bath"'),
    description: z.string().optional().describe('The category description, which can include HTML formatting.'),
    views: z.number().optional().describe('Number of views the category has on the storefront.'),
    sort_order: z.number().optional().describe('Priority this category will be given when included in the menu and category pages.'),
    page_title: z.string().optional().describe('Custom title for the category page.'),
    search_keywords: z.string().optional().describe('A comma-separated list of keywords that can be used to locate the category.'),
    meta_keywords: z.array(z.string()).optional().describe('Custom meta keywords for the category page. Must post as an array like: ["awesome","sauce"].'),
    meta_description: z.string().optional().describe('Custom meta description for the category page.'),
    layout_file: z.string().optional().describe('A valid layout file.'),
    is_visible: z.boolean().optional().describe('Flag to determine whether the category should be displayed to customers.'),
    default_product_sort: z
        .enum(['use_store_settings', 'featured', 'newest', 'best_selling', 'alpha_asc', 'alpha_desc', 'avg_customer_review', 'price_asc', 'price_desc'])
        .optional()
        .describe('Determines how the products are sorted on category page load.'),
    image_url: z.string().optional().describe('Image URL used for this category on the storefront.'),
    custom_url: CustomUrlSchema.optional().describe('The custom URL for the category on the storefront.')
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    parent_id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    views: z.number().nullable().optional(),
    sort_order: z.number().nullable().optional(),
    page_title: z.string().nullable().optional(),
    search_keywords: z.string().nullable().optional(),
    meta_keywords: z.array(z.string()).nullable().optional(),
    meta_description: z.string().nullable().optional(),
    layout_file: z.string().nullable().optional(),
    is_visible: z.boolean().optional(),
    default_product_sort: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    custom_url: CustomUrlSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderCategorySchema,
    meta: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.number().describe('Unique ID of the Category.'),
    parent_id: z.number().describe("The unique numeric ID of the category's parent."),
    name: z.string().describe('The name displayed for the category.'),
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
    custom_url: CustomUrlSchema.optional()
});

const action = createAction({
    description: 'Create a category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            parent_id: input.parent_id,
            name: input.name
        };

        if (input.description !== undefined) {
            payload['description'] = input.description;
        }
        if (input.views !== undefined) {
            payload['views'] = input.views;
        }
        if (input.sort_order !== undefined) {
            payload['sort_order'] = input.sort_order;
        }
        if (input.page_title !== undefined) {
            payload['page_title'] = input.page_title;
        }
        if (input.search_keywords !== undefined) {
            payload['search_keywords'] = input.search_keywords;
        }
        if (input.meta_keywords !== undefined) {
            payload['meta_keywords'] = input.meta_keywords;
        }
        if (input.meta_description !== undefined) {
            payload['meta_description'] = input.meta_description;
        }
        if (input.layout_file !== undefined) {
            payload['layout_file'] = input.layout_file;
        }
        if (input.is_visible !== undefined) {
            payload['is_visible'] = input.is_visible;
        }
        if (input.default_product_sort !== undefined) {
            payload['default_product_sort'] = input.default_product_sort;
        }
        if (input.image_url !== undefined) {
            payload['image_url'] = input.image_url;
        }
        if (input.custom_url !== undefined) {
            payload['custom_url'] = input.custom_url;
        }

        // https://developer.bigcommerce.com/docs/rest-management/catalog/categories#create-a-category
        const response = await nango.post({
            endpoint: '/v3/catalog/categories',
            data: payload,
            retries: 10
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const category = parsed.data.data;

        return {
            id: category.id,
            parent_id: category.parent_id,
            name: category.name,
            ...(category.description != null && { description: category.description }),
            ...(category.views != null && { views: category.views }),
            ...(category.sort_order != null && { sort_order: category.sort_order }),
            ...(category.page_title != null && { page_title: category.page_title }),
            ...(category.search_keywords != null && { search_keywords: category.search_keywords }),
            ...(category.meta_keywords != null && { meta_keywords: category.meta_keywords }),
            ...(category.meta_description != null && { meta_description: category.meta_description }),
            ...(category.layout_file != null && { layout_file: category.layout_file }),
            ...(category.is_visible != null && { is_visible: category.is_visible }),
            ...(category.default_product_sort != null && { default_product_sort: category.default_product_sort }),
            ...(category.image_url != null && { image_url: category.image_url }),
            ...(category.custom_url != null && { custom_url: category.custom_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
