import { z } from 'zod';
import { createAction } from 'nango';

const CustomUrlSchema = z.object({
    url: z.string().optional(),
    is_customized: z.boolean().optional()
});

const InputSchema = z.object({
    brand_id: z.number().describe('The ID of the brand to update. Example: 35'),
    name: z.string().optional().describe('The name of the brand. Must be unique.'),
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
    page_title: z.string().nullable().optional(),
    meta_keywords: z.array(z.string()).nullable().optional(),
    meta_description: z.string().nullable().optional(),
    search_keywords: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    custom_url: CustomUrlSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    page_title: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    search_keywords: z.string().optional(),
    image_url: z.string().optional(),
    custom_url: CustomUrlSchema.optional()
});

const action = createAction({
    description: 'Update a brand.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.page_title !== undefined) {
            body['page_title'] = input.page_title;
        }
        if (input.meta_keywords !== undefined) {
            body['meta_keywords'] = input.meta_keywords;
        }
        if (input.meta_description !== undefined) {
            body['meta_description'] = input.meta_description;
        }
        if (input.search_keywords !== undefined) {
            body['search_keywords'] = input.search_keywords;
        }
        if (input.image_url !== undefined) {
            body['image_url'] = input.image_url;
        }
        if (input.custom_url !== undefined) {
            body['custom_url'] = input.custom_url;
        }

        const response = await nango.put({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/brands#update-brand
            endpoint: `/v3/catalog/brands/${encodeURIComponent(String(input.brand_id))}`,
            data: body,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Brand with ID ${input.brand_id} was not found.`
            });
        }

        if (response.status === 409) {
            throw new nango.ActionError({
                type: 'conflict',
                message: 'The brand was in conflict with another brand. This may be due to a duplicate unique name.'
            });
        }

        if (response.status === 422) {
            throw new nango.ActionError({
                type: 'unprocessable_entity',
                message: 'The brand was not valid. Check for missing required fields or invalid data.'
            });
        }

        const rawData = z
            .object({
                data: z.unknown()
            })
            .parse(response.data);

        const providerBrand = ProviderBrandSchema.parse(rawData.data);

        return {
            id: providerBrand.id,
            name: providerBrand.name,
            ...(providerBrand.page_title != null && { page_title: providerBrand.page_title }),
            ...(providerBrand.meta_keywords != null && { meta_keywords: providerBrand.meta_keywords }),
            ...(providerBrand.meta_description != null && { meta_description: providerBrand.meta_description }),
            ...(providerBrand.search_keywords != null && { search_keywords: providerBrand.search_keywords }),
            ...(providerBrand.image_url != null && { image_url: providerBrand.image_url }),
            ...(providerBrand.custom_url != null && { custom_url: providerBrand.custom_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
