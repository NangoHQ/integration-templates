import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    smart_plus_ad_ids: z.array(z.string()).optional().describe('Filter by Smart+ ad IDs.'),
    adgroup_ids: z.array(z.string()).optional().describe('Filter by ad group IDs.'),
    campaign_ids: z.array(z.string()).optional().describe('Filter by campaign IDs.'),
    creation_filter_start_time: z.string().optional().describe('Filter by creation start time (yyyy-mm-dd hh:mm:ss).'),
    creation_filter_end_time: z.string().optional().describe('Filter by creation end time (yyyy-mm-dd hh:mm:ss).'),
    modified_after: z.string().optional().describe('Filter by modified after time (yyyy-mm-dd hh:mm:ss).'),
    objective_type: z.string().optional().describe('Filter by objective type.'),
    optimization_goal: z.string().optional().describe('Filter by optimization goal.'),
    primary_status: z.string().optional().describe('Filter by primary status.'),
    secondary_status: z.string().optional().describe('Filter by secondary status.'),
    page: z.number().optional().describe('Page number. Default: 1'),
    page_size: z.number().optional().describe('Page size. Default: 10'),
    fields: z.array(z.string()).optional().describe('Specific fields to return.')
});

const ProviderPageInfoSchema = z
    .object({
        page: z.number().optional(),
        page_size: z.number().optional(),
        total_number: z.number().optional(),
        total_page: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    ads: z.array(z.object({}).passthrough()),
    page_info: ProviderPageInfoSchema.optional()
});

const TikTokResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            list: z.array(z.object({}).passthrough()).optional(),
            page_info: ProviderPageInfoSchema.optional()
        })
        .passthrough()
        .optional()
});

const action = createAction({
    description: 'Retrieve Smart+ ad details from TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {
            advertiser_id: input['advertiser_id']
        };

        const filtering: Record<string, unknown> = {};
        if (input['smart_plus_ad_ids'] !== undefined && input['smart_plus_ad_ids'].length > 0) {
            filtering['smart_plus_ad_ids'] = input['smart_plus_ad_ids'];
        }
        if (input['adgroup_ids'] !== undefined && input['adgroup_ids'].length > 0) {
            filtering['adgroup_ids'] = input['adgroup_ids'];
        }
        if (input['campaign_ids'] !== undefined && input['campaign_ids'].length > 0) {
            filtering['campaign_ids'] = input['campaign_ids'];
        }
        if (input['creation_filter_start_time'] !== undefined) {
            filtering['creation_filter_start_time'] = input['creation_filter_start_time'];
        }
        if (input['creation_filter_end_time'] !== undefined) {
            filtering['creation_filter_end_time'] = input['creation_filter_end_time'];
        }
        if (input['modified_after'] !== undefined) {
            filtering['modified_after'] = input['modified_after'];
        }
        if (input['objective_type'] !== undefined) {
            filtering['objective_type'] = input['objective_type'];
        }
        if (input['optimization_goal'] !== undefined) {
            filtering['optimization_goal'] = input['optimization_goal'];
        }
        if (input['primary_status'] !== undefined) {
            filtering['primary_status'] = input['primary_status'];
        }
        if (input['secondary_status'] !== undefined) {
            filtering['secondary_status'] = input['secondary_status'];
        }

        if (Object.keys(filtering).length > 0) {
            params['filtering'] = JSON.stringify(filtering);
        }

        if (input['page'] !== undefined) {
            params['page'] = input['page'];
        }
        if (input['page_size'] !== undefined) {
            params['page_size'] = input['page_size'];
        }
        if (input['fields'] !== undefined && input['fields'].length > 0) {
            params['fields'] = JSON.stringify(input['fields']);
        }

        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1739963167170561
            endpoint: 'smart_plus/ad/get/',
            params,
            retries: 3
        });

        const parsed = TikTokResponseSchema.parse(response.data);

        if (parsed['code'] !== undefined && parsed['code'] !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: parsed['message'] || 'TikTok API returned an error',
                code: parsed['code'],
                request_id: parsed['request_id']
            });
        }

        return {
            ads: parsed['data']?.['list'] || [],
            ...(parsed['data']?.['page_info'] !== undefined && { page_info: parsed['data']['page_info'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
