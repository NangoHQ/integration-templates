import { z } from 'zod';
import { createAction } from 'nango';

const CustomUrlSchema = z.object({
    url: z.string().optional(),
    is_customized: z.boolean().optional()
});

const InputSchema = z.object({
    name: z.string().describe('The name of the brand. Must be unique. Example: "Common Good"'),
    page_title: z.string().optional().describe('The title shown in the browser while viewing the brand.'),
    meta_keywords: z.array(z.string()).optional().describe('An array of meta keywords to include in the HTML.'),
    meta_description: z.string().optional().describe('A meta description to include.'),
    search_keywords: z.string().optional().describe('A comma-separated list of keywords that can be used to locate this brand.'),
    image_url: z.string().optional().describe('Image URL used for this brand on the storefront.'),
    custom_url: CustomUrlSchema.optional().describe('The custom URL for the brand on the storefront.')
});

const ProviderBrandSchema = z.object({
    id: z.number(),
    name: z.string(),
    page_title: z.string().optional().nullable(),
    meta_keywords: z.array(z.string()).optional().nullable(),
    meta_description: z.string().optional().nullable(),
    search_keywords: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    custom_url: z
        .object({
            url: z.string().optional().nullable(),
            is_customized: z.boolean().optional().nullable()
        })
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    id: z.number().describe('Unique ID of the brand. Example: 50'),
    name: z.string().describe('The name of the brand.'),
    page_title: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    search_keywords: z.string().optional(),
    image_url: z.string().optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a brand.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.proxy({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/brands#create-brand
            method: 'POST',
            endpoint: '/v3/catalog/brands',
            data: {
                name: input.name,
                ...(input.page_title !== undefined && { page_title: input.page_title }),
                ...(input.meta_keywords !== undefined && { meta_keywords: input.meta_keywords }),
                ...(input.meta_description !== undefined && { meta_description: input.meta_description }),
                ...(input.search_keywords !== undefined && { search_keywords: input.search_keywords }),
                ...(input.image_url !== undefined && { image_url: input.image_url }),
                ...(input.custom_url !== undefined && { custom_url: input.custom_url })
            },
            retries: 10
        });

        if (response.status === 409) {
            throw new nango.ActionError({
                type: 'conflict',
                message: 'Brand name already exists.'
            });
        }

        if (response.status === 422) {
            throw new nango.ActionError({
                type: 'unprocessable_entity',
                message: 'Brand data was not valid. Check required fields and data format.'
            });
        }

        const responseBody = response.data;
        if (!responseBody || typeof responseBody !== 'object' || !('data' in responseBody)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from BigCommerce API.'
            });
        }

        const brandData = responseBody.data;
        if (!brandData || typeof brandData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Brand data is missing in the response.'
            });
        }

        const parsed = ProviderBrandSchema.parse(brandData);

        const customUrl = parsed.custom_url
            ? {
                  ...(parsed.custom_url.url != null && { url: parsed.custom_url.url }),
                  ...(parsed.custom_url.is_customized != null && { is_customized: parsed.custom_url.is_customized })
              }
            : undefined;

        return {
            id: parsed.id,
            name: parsed.name,
            ...(parsed.page_title != null && { page_title: parsed.page_title }),
            ...(parsed.meta_keywords != null && { meta_keywords: parsed.meta_keywords }),
            ...(parsed.meta_description != null && { meta_description: parsed.meta_description }),
            ...(parsed.search_keywords != null && { search_keywords: parsed.search_keywords }),
            ...(parsed.image_url != null && { image_url: parsed.image_url }),
            ...(customUrl !== undefined && Object.keys(customUrl).length > 0 && { custom_url: customUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
