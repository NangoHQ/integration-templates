import { z } from 'zod';
import { createAction } from 'nango';

const ScheduleParamSourceSchema = z.object({
    password: z.string().optional(),
    uri: z.string().optional(),
    username: z.string().optional()
});

const ScheduleParamSchema = z.object({
    day_of_month: z.number().optional(),
    hour: z.number().optional(),
    interval_count: z.number().optional(),
    interval_type: z.string().optional(),
    minute: z.number().optional(),
    source: ScheduleParamSourceSchema.optional(),
    timezone: z.string().optional()
});

const InputSchema = z.object({
    bc_id: z.string().describe('Business Center ID. Example: "1234567890"'),
    catalog_id: z.string().describe('Catalog ID. Example: "1234567890"'),
    feed_id: z.string().describe('Feed ID. Example: "1234567890"'),
    feed_name: z.string().describe('Name of the feed. Example: "Updated Feed Name"'),
    schedule_param: ScheduleParamSchema.optional(),
    update_mode: z.string().describe('Update mode. Example: "INCREMENTAL" or "REPLACE"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
    request_id: z.string().optional()
});

const OutputSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Update a catalog product feed in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1740665197662210
            endpoint: '/catalog/feed/update/',
            data: {
                bc_id: input.bc_id,
                catalog_id: input.catalog_id,
                feed_id: input.feed_id,
                feed_name: input.feed_name,
                update_mode: input.update_mode,
                ...(input.schedule_param !== undefined && { schedule_param: input.schedule_param })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        return {
            code: providerResponse.code,
            message: providerResponse.message,
            ...(providerResponse.request_id !== undefined && { request_id: providerResponse.request_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
