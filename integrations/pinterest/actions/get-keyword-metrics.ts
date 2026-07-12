import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    country_code: z.string().describe('Two-letter country code (ISO 3166-1 alpha-2). Example: "US"'),
    keywords: z.array(z.string()).min(1).max(2000).describe('Keywords to get metrics for. Example: ["coffee", "tea"]')
});

const ProviderKeywordMetricsSchema = z
    .object({
        KEYWORD_QUERY_VOLUME: z.string().optional()
    })
    .passthrough();

const ProviderKeywordMetricsResponseSchema = z
    .object({
        keyword: z.string(),
        metrics: ProviderKeywordMetricsSchema.optional().nullable()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        data: z.array(ProviderKeywordMetricsResponseSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(
        z
            .object({
                keyword: z.string(),
                metrics: z
                    .object({
                        KEYWORD_QUERY_VOLUME: z.string().optional()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
    )
});

const action = createAction({
    description: 'Get search-volume metrics for keywords in a country.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/country_keywords_metrics/get
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/keywords/metrics`,
            params: {
                country_code: input.country_code,
                keywords: input.keywords.join(',')
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: (providerResponse.data || []).map((item) => ({
                keyword: item.keyword,
                ...(item.metrics != null && { metrics: item.metrics })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
