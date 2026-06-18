import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    brand_id: z.number().describe('The ID of the brand to retrieve. Example: 35')
});

const ProviderCustomUrlSchema = z.object({
    url: z.string(),
    is_customized: z.boolean()
});

const ProviderBrandSchema = z.object({
    id: z.number(),
    name: z.string(),
    page_title: z.string().optional(),
    meta_keywords: z.array(z.string()).nullable().optional(),
    meta_description: z.string().nullable().optional(),
    search_keywords: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    custom_url: ProviderCustomUrlSchema.optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    page_title: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    search_keywords: z.string().optional(),
    image_url: z.string().optional(),
    custom_url: ProviderCustomUrlSchema.optional()
});

const action = createAction({
    description: 'Retrieve a brand.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.bigcommerce.com/docs/rest-management/catalog/brands#get-a-brand
        const response = await nango.get({
            endpoint: `/v3/catalog/brands/${encodeURIComponent(String(input.brand_id))}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Brand not found with ID: ${input.brand_id}`
            });
        }

        const responseData = z.object({ data: z.unknown() }).parse(response.data);
        const providerData = ProviderBrandSchema.parse(responseData.data);

        return {
            id: providerData.id,
            name: providerData.name,
            ...(providerData.page_title !== undefined && { page_title: providerData.page_title }),
            ...(providerData.meta_keywords != null && { meta_keywords: providerData.meta_keywords }),
            ...(providerData.meta_description != null && { meta_description: providerData.meta_description }),
            ...(providerData.search_keywords != null && { search_keywords: providerData.search_keywords }),
            ...(providerData.image_url != null && { image_url: providerData.image_url }),
            ...(providerData.custom_url !== undefined && { custom_url: providerData.custom_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
