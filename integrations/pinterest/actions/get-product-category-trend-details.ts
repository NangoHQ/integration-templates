import { z } from 'zod';
import { createAction } from 'nango';

const ProductCategoryEnumSchema = z.string().describe('Pinterest product category identifier. Example: "ARTWORK"');

const InputSchema = z.object({
    product_categories: z
        .array(ProductCategoryEnumSchema)
        .min(1)
        .max(20)
        .describe('List of product categories to retrieve trend details for. Example: ["ARTWORK", "AUDIO"]'),
    region: z.string().describe('The geographic region of interest. Example: "US", "GB+IE", "CA"'),
    lookback_window: z
        .union([z.literal(90), z.literal(180), z.literal(365), z.literal(730)])
        .optional()
        .describe('Time period for historical data analysis in days. Defaults to 365.'),
    engagement_type: z
        .union([z.literal('ENGAGEMENT'), z.literal('OUTBOUND_CLICK'), z.literal('SAVE')])
        .optional()
        .describe('Type of engagement metric to analyze. Defaults to ENGAGEMENT.')
});

const GenderDemographicsSchema = z.object({
    male: z.number(),
    female: z.number(),
    unspecified: z.number()
});

const ProductCategoriesDemographicSchema = z.object({
    age: z.record(z.string(), z.number()).optional(),
    gender: GenderDemographicsSchema.optional()
});

const InnerProductCategoriesMetricsHighlightsSchema = z.object({
    pct_change_mom: z.number()
});

const ProductCategoriesMetricsHighlightsSchema = z.object({
    engagement: InnerProductCategoriesMetricsHighlightsSchema.optional(),
    outbound_clicks: InnerProductCategoriesMetricsHighlightsSchema.optional(),
    pin_saves: InnerProductCategoriesMetricsHighlightsSchema.optional()
});

const ProductCategoryDetailsSchema = z.object({
    product_category: ProductCategoryEnumSchema,
    has_prediction: z.boolean(),
    demographics: ProductCategoriesDemographicSchema.optional(),
    metrics_highlights: ProductCategoriesMetricsHighlightsSchema.optional(),
    related_searches: z.array(z.string()).optional(),
    time_series: z.record(z.string(), z.number()).optional(),
    predicted_time_series: z.record(z.string(), z.number()).optional()
});

const OutputSchema = z.array(ProductCategoryDetailsSchema);

const action = createAction({
    description: 'Get trend details for specific Shopping product categories.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[]> = {
            product_categories: input.product_categories,
            region: input.region
        };

        if (input.lookback_window !== undefined) {
            params['lookback_window'] = input.lookback_window;
        }

        if (input.engagement_type !== undefined) {
            params['engagement_type'] = input.engagement_type;
        }

        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/trends_product_categories_details/list
            endpoint: '/v5/trends/product_categories/details',
            params,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
