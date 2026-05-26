import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bc_id: z.string().describe('Business Center ID. Example: "7644143197428744199"'),
    catalog_id: z.string().optional().describe('Catalog ID. If provided, filters to the specific catalog. Example: "1234567890"')
});

const CatalogSchema = z.object({
    catalog_id: z.string(),
    name: z.string().optional(),
    catalog_type: z.string().optional(),
    status: z.string().optional(),
    region_code: z.string().optional(),
    currency: z.string().optional(),
    create_time: z.string().optional(),
    bc_id: z.string().optional()
});

const PageInfoSchema = z.object({
    page: z.number(),
    page_size: z.number(),
    total_page: z.number(),
    total_number: z.number()
});

const TikTokResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z.object({
        list: z.array(z.unknown()),
        page_info: PageInfoSchema.optional()
    })
});

const OutputSchema = z.object({
    catalogs: z.array(CatalogSchema),
    page_info: PageInfoSchema.optional()
});

const action = createAction({
    description: 'Retrieve a product catalog from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-catalog',
        group: 'Catalog'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs?id=1740315452868610
        const response = await nango.get({
            endpoint: 'catalog/get/',
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            params: {
                bc_id: input.bc_id,
                ...(input.catalog_id !== undefined && { catalog_id: input.catalog_id })
            },
            retries: 3
        });

        const parsedResponse = TikTokResponseSchema.parse(response.data);

        if (parsedResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsedResponse.message,
                code: parsedResponse.code
            });
        }

        const catalogs = parsedResponse.data.list.map((item) => CatalogSchema.parse(item));

        if (input.catalog_id) {
            const filtered = catalogs.filter((catalog) => catalog.catalog_id === input.catalog_id);
            return {
                catalogs: filtered,
                ...(parsedResponse.data.page_info && { page_info: parsedResponse.data.page_info })
            };
        }

        return {
            catalogs,
            ...(parsedResponse.data.page_info && { page_info: parsedResponse.data.page_info })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
