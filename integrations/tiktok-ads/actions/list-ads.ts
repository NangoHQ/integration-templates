import { z } from 'zod';
import { createAction } from 'nango';

const FilteringSchema = z.object({
    ad_ids: z.array(z.string()).optional(),
    ad_name: z.string().optional(),
    adgroup_ids: z.array(z.string()).optional(),
    buying_types: z.array(z.string()).optional(),
    campaign_ids: z.array(z.string()).optional(),
    campaign_system_origins: z.array(z.string()).optional(),
    creation_filter_end_time: z.string().optional(),
    creation_filter_start_time: z.string().optional(),
    creative_material_mode: z.string().optional(),
    destination: z.string().optional(),
    modified_after: z.string().optional(),
    objective_type: z.string().optional(),
    optimization_goal: z.string().optional(),
    primary_status: z.string().optional(),
    secondary_status: z.string().optional()
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('TikTok Advertiser ID. Example: "7644143197428744199"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    page_size: z.number().int().min(1).max(1000).optional().describe('Number of records per page. Maximum is 1000.'),
    filtering: FilteringSchema.optional()
});

const PageInfoSchema = z.object({
    page: z.number(),
    page_size: z.number(),
    total_page: z.number(),
    total_number: z.number()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z
        .object({
            list: z.array(z.record(z.string(), z.unknown())),
            page_info: PageInfoSchema
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(z.record(z.string(), z.unknown())),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List ads from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-ads',
        group: 'Ads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const page = input.cursor ? Number(input.cursor) : 1;
        if (Number.isNaN(page) || !Number.isInteger(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string'
            });
        }

        const params: Record<string, string | number | string[] | number[]> = {
            advertiser_id: input.advertiser_id,
            page: page
        };

        if (input.page_size !== undefined) {
            params['page_size'] = input.page_size;
        }

        if (input.filtering !== undefined) {
            const filtering: Record<string, unknown> = {};
            const filteringInput = input.filtering;
            if (filteringInput['ad_ids'] !== undefined) {
                filtering['ad_ids'] = filteringInput['ad_ids'];
            }
            if (filteringInput['ad_name'] !== undefined) {
                filtering['ad_name'] = filteringInput['ad_name'];
            }
            if (filteringInput['adgroup_ids'] !== undefined) {
                filtering['adgroup_ids'] = filteringInput['adgroup_ids'];
            }
            if (filteringInput['buying_types'] !== undefined) {
                filtering['buying_types'] = filteringInput['buying_types'];
            }
            if (filteringInput['campaign_ids'] !== undefined) {
                filtering['campaign_ids'] = filteringInput['campaign_ids'];
            }
            if (filteringInput['campaign_system_origins'] !== undefined) {
                filtering['campaign_system_origins'] = filteringInput['campaign_system_origins'];
            }
            if (filteringInput['creation_filter_end_time'] !== undefined) {
                filtering['creation_filter_end_time'] = filteringInput['creation_filter_end_time'];
            }
            if (filteringInput['creation_filter_start_time'] !== undefined) {
                filtering['creation_filter_start_time'] = filteringInput['creation_filter_start_time'];
            }
            if (filteringInput['creative_material_mode'] !== undefined) {
                filtering['creative_material_mode'] = filteringInput['creative_material_mode'];
            }
            if (filteringInput['destination'] !== undefined) {
                filtering['destination'] = filteringInput['destination'];
            }
            if (filteringInput['modified_after'] !== undefined) {
                filtering['modified_after'] = filteringInput['modified_after'];
            }
            if (filteringInput['objective_type'] !== undefined) {
                filtering['objective_type'] = filteringInput['objective_type'];
            }
            if (filteringInput['optimization_goal'] !== undefined) {
                filtering['optimization_goal'] = filteringInput['optimization_goal'];
            }
            if (filteringInput['primary_status'] !== undefined) {
                filtering['primary_status'] = filteringInput['primary_status'];
            }
            if (filteringInput['secondary_status'] !== undefined) {
                filtering['secondary_status'] = filteringInput['secondary_status'];
            }

            if (Object.keys(filtering).length > 0) {
                params['filtering'] = JSON.stringify(filtering);
            }
        }

        // https://business-api.tiktok.com/portal/docs?id=1735735588640770
        const response = await nango.get({
            endpoint: '/ad/get/',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message
            });
        }

        if (!parsed.data) {
            return { items: [] };
        }

        const nextCursor = parsed.data.page_info.page < parsed.data.page_info.total_page ? String(parsed.data.page_info.page + 1) : undefined;

        return {
            items: parsed.data.list,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
