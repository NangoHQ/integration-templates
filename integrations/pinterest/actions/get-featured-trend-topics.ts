import { z } from 'zod';
import { createAction } from 'nango';

const TrendingPinSchema = z.object({
    src: z.string(),
    width: z.number().int(),
    id: z.string(),
    height: z.number().int(),
    color: z.string(),
    vertical_offset: z.number().optional()
});

const TrendingTopicSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    percent_growth_mom: z.number().int().optional(),
    related_interests: z.array(z.string()),
    related_searches: z.array(z.string()),
    time_series: z.record(z.string(), z.number()),
    pins: z.array(TrendingPinSchema)
});

const FeaturedTrendSchema = z.object({
    interest: z.string(),
    market: z.string().optional(),
    trends: z.array(TrendingTopicSchema).optional()
});

const InputSchema = z.object({
    region: z.string().describe('The geographic region of interest. Example: "US"'),
    interest: z.string().optional().describe('Interest to filter by. Example: "FASHION"')
});

const OutputSchema = z.array(FeaturedTrendSchema);

const action = createAction({
    description: "Get Pinterest's featured trending topics for a region.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/trends_featured_topics/list
            endpoint: '/v5/trends/topics/featured',
            params: {
                region: input.region,
                ...(input.interest !== undefined && { interest: input.interest })
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
