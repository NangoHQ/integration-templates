import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    catalog_id: z.string().describe('Catalog ID. Example: "123456789"'),
    bc_id: z.string().describe('Business Center ID. Example: "123456789"'),
    feed_id: z.string().optional().describe('Feed ID. If provided, returns the specific feed. Example: "987654321"')
});

const ScheduleParamSourceSchema = z
    .object({
        source_type: z.string().optional(),
        source_url: z.string().optional()
    })
    .passthrough();

const ScheduleParamSchema = z
    .object({
        day_of_month: z.number().optional(),
        hour: z.number().optional(),
        interval_count: z.number().optional(),
        interval_type: z.string().optional(),
        minute: z.number().optional(),
        source: ScheduleParamSourceSchema.optional(),
        timezone: z.string().optional()
    })
    .passthrough();

const FeedSchema = z
    .object({
        feed_id: z.string(),
        feed_name: z.string(),
        update_mode: z.string(),
        schedule_param: ScheduleParamSchema.optional(),
        catalog_id: z.string().optional(),
        bc_id: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            list: z.array(z.unknown()).optional()
        })
        .passthrough()
        .optional()
});

const OutputSchema = z.object({
    feeds: z.array(FeedSchema)
});

const action = createAction({
    description: 'Retrieve a catalog product feed from TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1740665183073281
            endpoint: '/catalog/feed/get/',
            params: {
                catalog_id: input.catalog_id,
                bc_id: input.bc_id,
                ...(input.feed_id !== undefined && { feed_id: input.feed_id })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || `TikTok API returned error code ${providerResponse.code}`,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        const feedList = providerResponse.data?.list ?? [];
        const feeds = feedList.map((item: unknown) => FeedSchema.parse(item));

        return { feeds };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
