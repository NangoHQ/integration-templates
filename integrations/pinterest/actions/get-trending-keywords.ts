import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    region: z
        .string()
        .describe('The geographic region of interest, formatted as an ISO 3166-2 country code or combined codes (e.g., "US", "GB+IE"). Example: "US"'),
    trend_type: z.enum(['growing', 'monthly', 'yearly', 'seasonal']).describe('The methodology used to rank how trendy a keyword is. Example: "monthly"'),
    interests: z
        .array(
            z.enum([
                'animals',
                'architecture',
                'art',
                'beauty',
                'childrens_fashion',
                'design',
                'diy_and_crafts',
                'education',
                'electronics',
                'entertainment',
                'event_planning',
                'finance',
                'food_and_drinks',
                'gardening',
                'health',
                'home_decor',
                'mens_fashion',
                'parenting',
                'quotes',
                'sport',
                'travel',
                'vehicles',
                'wedding',
                'womens_fashion'
            ])
        )
        .optional()
        .describe('Interest categories to filter trends. Example: ["food_and_drinks", "travel"]'),
    genders: z
        .array(z.enum(['male', 'female', 'unknown']))
        .optional()
        .describe('Gender categories to filter trends. Example: ["female"]'),
    ages: z
        .array(z.enum(['18-24', '25-34', '35-44', '45-49', '50-54', '55-64', '65+']))
        .optional()
        .describe('Age ranges to filter trends. Example: ["25-34"]'),
    include_keywords: z.array(z.string().min(1).max(100)).max(50).optional().describe('Keywords to include in the filter. Example: ["recipes", "dessert"]'),
    normalize_against_group: z
        .boolean()
        .optional()
        .describe('Whether to normalize time series data against the group instead of independently. Default: false'),
    limit: z.number().int().min(1).max(50).optional().describe('Maximum number of trending keywords to return (1-50). Default: 50'),
    include_demographics: z.boolean().optional().describe('Whether to include age and gender distribution for each keyword. Default: false')
});

const TimeSeriesSchema = z
    .object({
        date: z.string().optional()
    })
    .catchall(z.number());

const TrendingKeywordSchema = z.object({
    keyword: z.string().optional(),
    pct_growth_mom: z.number().optional(),
    pct_growth_wow: z.number().optional(),
    pct_growth_yoy: z.number().optional(),
    has_prediction: z.boolean().optional(),
    time_series: TimeSeriesSchema.optional(),
    predicted_time_series: TimeSeriesSchema.optional(),
    demographics: z
        .object({
            age_distribution: z.record(z.string(), z.number()).nullable().optional(),
            gender_distribution: z.record(z.string(), z.number()).nullable().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    trends: z.array(TrendingKeywordSchema)
});

const action = createAction({
    description: 'Get top trending search keywords for a region.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/trending_keywords/list
            endpoint: `/v5/trends/keywords/${encodeURIComponent(input.region)}/top/${encodeURIComponent(input.trend_type)}`,
            params: {
                ...(input.interests !== undefined && input.interests.length > 0 && { interests: input.interests }),
                ...(input.genders !== undefined && input.genders.length > 0 && { genders: input.genders }),
                ...(input.ages !== undefined && input.ages.length > 0 && { ages: input.ages }),
                ...(input.include_keywords !== undefined && input.include_keywords.length > 0 && { include_keywords: input.include_keywords }),
                ...(input.normalize_against_group !== undefined && { normalize_against_group: input.normalize_against_group ? 'true' : 'false' }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.include_demographics !== undefined && { include_demographics: input.include_demographics ? 'true' : 'false' })
            },
            retries: 3
        });

        const providerResponse = OutputSchema.parse(response.data);

        return {
            trends: providerResponse.trends
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
