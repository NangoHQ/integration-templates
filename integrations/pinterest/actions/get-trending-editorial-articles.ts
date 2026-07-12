import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    region: z.enum(['US', 'GB+IE', 'CA']).describe('The geographic region of interest. Example: "US"')
});

const KeywordInfoSchema = z.object({
    name: z.string(),
    pct_growth_mom: z.number().optional()
});

const TrendsEditorialSchema = z.object({
    title: z.string(),
    description: z.string(),
    board_url: z.string(),
    pins_url: z.array(z.string()),
    interests: z.array(z.string()),
    related_keywords: z.array(KeywordInfoSchema)
});

const OutputSchema = z.array(TrendsEditorialSchema);

const action = createAction({
    description: 'Get Pinterest editorial trend articles for a region.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#tag/trends/operation/trends_editorial_articles/list
        const response = await nango.get({
            endpoint: '/v5/trends/editorial_articles',
            params: {
                region: input.region
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
