import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    discovery_type: z.string().describe('Discovery type. Examples: HASHTAG, VIDEO, CREATOR, SONG'),
    country_code: z.string().optional().describe('Country code. Default: US'),
    category_name: z.string().optional().describe('Category name. Default: ALL'),
    date_range: z.string().optional().describe('Date range. Default: 7DAY')
});

const ProviderTrendingItemSchema = z.object({}).passthrough();

const ProviderPaginationSchema = z.object({
    page: z.number().optional(),
    page_size: z.number().optional(),
    total: z.number().optional()
});

const ProviderDataSchema = z.object({
    list: z.array(ProviderTrendingItemSchema).optional(),
    pagination: ProviderPaginationSchema.optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: ProviderDataSchema.optional()
});

const OutputSchema = z.object({
    list: z.array(z.object({}).passthrough()).optional(),
    pagination: ProviderPaginationSchema.optional()
});

const action = createAction({
    description: 'Retrieve trending TikTok content and hashtags for creative inspiration.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1825119032526849
            endpoint: 'discovery/trending_list/',
            params: {
                advertiser_id: input.advertiser_id,
                discovery_type: input.discovery_type,
                ...(input.country_code !== undefined && { country_code: input.country_code }),
                ...(input.category_name !== undefined && { category_name: input.category_name }),
                ...(input.date_range !== undefined && { date_range: input.date_range })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== undefined && providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || `Provider returned error code ${providerResponse.code}`,
                code: providerResponse.code
            });
        }

        return {
            ...(providerResponse.data?.list !== undefined && { list: providerResponse.data.list }),
            ...(providerResponse.data?.pagination !== undefined && { pagination: providerResponse.data.pagination })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
