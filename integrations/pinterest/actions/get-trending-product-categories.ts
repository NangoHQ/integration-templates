import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    region: z.enum(['US', 'GB+IE', 'CA']).describe('The geographic region of interest. Example: "US"'),
    verticals: z
        .array(z.enum(['FASHION', 'HOME_DECOR', 'BEAUTY']))
        .optional()
        .describe('List of verticals to filter by.'),
    ages: z
        .array(z.enum(['18-24', '25-34', '35-44', '45-49', '50-54', '55-64', '65+']))
        .optional()
        .describe('Age buckets to filter by.'),
    genders: z
        .array(z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']))
        .optional()
        .describe('Genders to filter by.'),
    engagement_type: z.enum(['ENGAGEMENT', 'OUTBOUND_CLICK', 'SAVE']).optional().describe('Type of engagement metric to analyze.')
});

const ProviderTrendingProductCategorySchema = z.object({
    engagement_type: z.string(),
    product_category: z.string(),
    pinterest_product_category_id: z.number(),
    pct_change_mom: z.number(),
    percent_relative_volume: z.number(),
    verticals: z.array(z.string()).optional()
});

const OutputItemSchema = z.object({
    engagement_type: z.string(),
    product_category: z.string(),
    pinterest_product_category_id: z.number(),
    pct_change_mom: z.number(),
    percent_relative_volume: z.number(),
    verticals: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema)
});

const action = createAction({
    description: 'Get growing Shopping product categories.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/trends_product_categories_trending/list
            endpoint: '/v5/trends/product_categories/trending',
            params: {
                region: input.region,
                ...(input.verticals !== undefined && { verticals: input.verticals }),
                ...(input.ages !== undefined && { ages: input.ages }),
                ...(input.genders !== undefined && { genders: input.genders }),
                ...(input.engagement_type !== undefined && { engagement_type: input.engagement_type })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of trending product categories from the Pinterest API.'
            });
        }

        const items = rawData.map((item: unknown) => {
            const parsed = ProviderTrendingProductCategorySchema.parse(item);
            return {
                engagement_type: parsed.engagement_type,
                product_category: parsed.product_category,
                pinterest_product_category_id: parsed.pinterest_product_category_id,
                pct_change_mom: parsed.pct_change_mom,
                percent_relative_volume: parsed.percent_relative_volume,
                ...(parsed.verticals !== undefined && { verticals: parsed.verticals })
            };
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
