import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        media_id: z.string().describe('The Instagram media object ID to retrieve insights for. Example: "17917362834521812"'),
        metrics: z
            .array(z.string())
            .min(1)
            .optional()
            .describe('Insight metrics to request. When omitted, a default set appropriate for the media product type is used.')
    })
    .describe('Input for retrieving insights for an Instagram media object.');

const InsightMetricSchema = z.object({
    name: z.string().describe('Metric name, such as "reach" or "likes".'),
    title: z.string().optional().describe('Human-readable metric title.'),
    description: z.string().optional().describe('Human-readable explanation of what the metric measures.'),
    period: z.string().describe('Time period over which the metric was measured, typically "lifetime".'),
    value: z.number().nullable().describe('Numeric value of the metric, or null when the provider returns no value.'),
    id: z.string().optional().describe('Provider identifier for the metric result.')
});

const OutputSchema = z
    .object({
        media_id: z.string().describe('The Instagram media object ID the insights belong to.'),
        metrics: z.array(InsightMetricSchema).describe('Insight metrics returned by the provider.')
    })
    .describe('Insight metrics for an Instagram media object.');

const ProviderInsightValueSchema = z.object({
    value: z.number()
});

const ProviderInsightSchema = z.object({
    name: z.string(),
    period: z.string(),
    values: z.array(ProviderInsightValueSchema).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    id: z.string().optional()
});

const ProviderInsightsResponseSchema = z.object({
    data: z.array(ProviderInsightSchema)
});

const ProviderMediaSchema = z.object({
    media_type: z.string().nullable().optional(),
    media_product_type: z.string().nullable().optional()
});

function defaultMetrics(mediaProductType: string | null | undefined): string[] {
    switch (mediaProductType) {
        case 'REELS':
            return ['reach', 'views', 'likes', 'comments', 'saved', 'shares', 'total_interactions'];
        case 'STORY':
            return ['reach', 'views', 'shares', 'total_interactions', 'replies', 'navigation'];
        default:
            return ['reach', 'views', 'likes', 'comments', 'saved', 'shares', 'total_interactions', 'profile_visits', 'follows'];
    }
}

/**
 * @tags: [read]
 * @tagReason: Reads insight metrics for an existing Instagram media object without modifying provider data.
 * @pitfalls: Metric availability depends on the media product type; requesting an unsupported metric fails the entire request, and metrics without data may be omitted rather than returned as zero, with data delayed up to 48 hours.
 */
const action = createAction({
    description: 'Retrieve insights metrics for an Instagram media object.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic', 'instagram_business_manage_insights'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let metrics = input.metrics;

        if (!metrics) {
            const mediaResponse = await nango.get({
                // https://developers.facebook.com/docs/instagram-platform/reference/instagram-media
                endpoint: `/${encodeURIComponent(input.media_id)}`,
                params: {
                    fields: 'media_type,media_product_type'
                },
                retries: 3
            });

            const media = ProviderMediaSchema.parse(mediaResponse.data);
            metrics = defaultMetrics(media.media_product_type);
        }

        const response = await nango.get({
            // https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
            endpoint: `/${encodeURIComponent(input.media_id)}/insights`,
            params: {
                metric: metrics.join(',')
            },
            retries: 3
        });

        const insights = ProviderInsightsResponseSchema.parse(response.data);

        return {
            media_id: input.media_id,
            metrics: insights.data.map((metric) => ({
                name: metric.name,
                ...(metric.title !== undefined && { title: metric.title }),
                ...(metric.description !== undefined && { description: metric.description }),
                period: metric.period,
                value: metric.values?.[0]?.value ?? null,
                ...(metric.id !== undefined && { id: metric.id })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
