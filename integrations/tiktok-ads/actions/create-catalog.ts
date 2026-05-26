import { z } from 'zod';
import { createAction } from 'nango';

const CatalogConfSchema = z.object({
    business_platform: z.string().optional(),
    channel: z.string().optional(),
    currency: z.string().describe('Currency code for the catalog. Example: "USD"'),
    region_code: z.string().describe('Region code for the catalog. Example: "US"')
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    name: z.string().describe('Name of the catalog. Example: "My Catalog"'),
    catalog_type: z
        .enum(['AUTO_VEHICLE', 'AUTO_MODEL', 'HOTEL', 'DESTINATION', 'FLIGHT', 'MINI_SERIES', 'RECRUITMENT', 'COMIC', 'ECOM', 'HOME_LISTING', 'ENTERTAINMENT'])
        .describe('Type of the catalog.'),
    catalog_conf: CatalogConfSchema.describe('Catalog configuration including currency and region.'),
    creative_asset_type: z.string().optional().describe('Creative asset type.')
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            catalog_id: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    catalog_id: z.string().describe('ID of the created catalog.').optional(),
    code: z.number().optional(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Create a product catalog in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-catalog',
        group: 'Catalog'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            advertiser_id: input.advertiser_id,
            name: input.name,
            catalog_type: input.catalog_type,
            catalog_conf: input.catalog_conf
        };

        if (input.creative_asset_type !== undefined) {
            body['creative_asset_type'] = input.creative_asset_type;
        }

        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1740306481704961
            endpoint: 'catalog/create/',
            data: body,
            retries: 3,
            ...(nango.connectionId === 'tiktok-ads-sandbox' && {
                baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/'
            })
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== undefined && providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'Unknown error from TikTok API',
                code: providerResponse.code
            });
        }

        return {
            ...(providerResponse.data?.catalog_id != null && { catalog_id: providerResponse.data.catalog_id }),
            ...(providerResponse.code !== undefined && { code: providerResponse.code }),
            ...(providerResponse.message !== undefined && { message: providerResponse.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
