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
    bc_id: z.string().describe('Business Center ID. Example: "123456789"'),
    catalog_id: z.string().describe('Catalog ID. Example: "123456789"'),
    feed_name: z.string().describe('Name of the feed. Example: "My Product Feed"'),
    update_mode: z.string().describe('Update mode. Example: "INCREMENTAL" or "OVERWRITE"'),
    schedule_param: ScheduleParamSchema.optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            feed_id: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    feed_id: z.string()
});

const action = createAction({
    description: 'Create a product feed for a catalog in TikTok Ads',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['catalog_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            bc_id: input.bc_id,
            catalog_id: input.catalog_id,
            feed_name: input.feed_name,
            update_mode: input.update_mode
        };

        if (input.schedule_param !== undefined) {
            requestBody['schedule_param'] = input.schedule_param;
        }

        // https://business-api.tiktok.com/portal/docs?id=1740665161957377
        const response = await nango.post({
            endpoint: '/catalog/feed/create/',
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== undefined && parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message || 'Unknown provider error',
                code: parsed.code,
                request_id: parsed.request_id
            });
        }

        const feedId = parsed.data?.feed_id;
        if (!feedId) {
            throw new nango.ActionError({
                type: 'missing_feed_id',
                message: 'Provider response did not contain a feed_id'
            });
        }

        return {
            feed_id: feedId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
