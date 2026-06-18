import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    category_id: z.number().describe('Category ID. Example: 12')
});

const CustomUrlSchema = z.object({
    url: z.string().optional(),
    is_customized: z.boolean().optional()
});

const CategorySchema = z.object({
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
    custom_url: CustomUrlSchema.optional()
});

const ProviderResponseSchema = z.object({
    data: CategorySchema,
    meta: z.object({}).optional()
});

const OutputSchema = CategorySchema;

const action = createAction({
    description: 'Retrieve a category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management
            endpoint: `/v3/catalog/categories/${encodeURIComponent(input.category_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return providerResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
