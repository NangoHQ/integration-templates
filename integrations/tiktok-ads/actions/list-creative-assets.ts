import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    page: z.number().optional().describe('Current page number. Default: 1'),
    page_size: z.number().optional().describe('Page size. Default: 20. Value range: 1-100'),
    filtering: z
        .object({
            image_ids: z.array(z.string()).optional().describe('A list of image IDs. At most 100 IDs.'),
            material_ids: z.array(z.string()).optional().describe('A list of material IDs. At most 100 IDs.'),
            width: z.number().optional().describe('Image width'),
            height: z.number().optional().describe('Image height'),
            signature: z.string().optional().describe('Image MD5 hash'),
            start_time: z.number().optional().describe('Start time filter, in seconds'),
            end_time: z.number().optional().describe('End time filter, in seconds'),
            displayable: z.boolean().optional().describe('Whether image can be displayed')
        })
        .optional()
        .describe('Filters on the data')
});

const ProviderImageSchema = z.object({
    image_id: z.string().optional(),
    format: z.string().optional(),
    image_url: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    signature: z.string().optional(),
    size: z.number().optional(),
    material_id: z.string().optional(),
    is_carousel_usable: z.boolean().optional(),
    file_name: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional(),
    displayable: z.boolean().optional()
});

const ProviderPageInfoSchema = z.object({
    page: z.number().optional(),
    page_size: z.number().optional(),
    total_number: z.number().optional(),
    total_page: z.number().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderImageSchema),
    page_info: ProviderPageInfoSchema.optional(),
    has_more: z.boolean().optional()
});

const action = createAction({
    description: 'List creative assets from TikTok Ads',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad'],

    exec: async (nango, input) => {
        const params: { [key: string]: string } = {
            advertiser_id: input.advertiser_id,
            page: String(input.page || 1),
            page_size: String(input.page_size || 20)
        };

        if (input.filtering) {
            params['filtering'] = JSON.stringify(input.filtering);
        }

        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs/api-reference/v1.3
            endpoint: 'file/image/ad/search/',
            params,
            retries: 3
        });

        const tikTokResponse = z
            .object({
                code: z.number(),
                message: z.string(),
                data: z
                    .object({
                        list: z.array(z.unknown()).optional(),
                        page_info: ProviderPageInfoSchema.optional()
                    })
                    .optional()
            })
            .parse(response.data);

        if (tikTokResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: tikTokResponse.message || `Provider returned error code ${tikTokResponse.code}`,
                code: tikTokResponse.code
            });
        }

        const providerData = tikTokResponse.data || {};

        const items = (providerData.list || []).map((item) => {
            return ProviderImageSchema.parse(item);
        });

        const pageInfo = providerData.page_info;
        const hasMore = pageInfo ? (pageInfo.page || 0) < (pageInfo.total_page || 0) : false;

        return {
            items,
            ...(pageInfo && { page_info: pageInfo }),
            has_more: hasMore
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
