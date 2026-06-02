import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_ids: z.array(z.string()).optional().describe('Filter by campaign IDs.'),
    adgroup_ids: z.array(z.string()).optional().describe('Filter by ad group IDs.'),
    primary_status: z.string().optional().describe('Filter by primary status. Example: "STATUS_NOT_DELETE"'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    page_size: z.number().int().min(1).max(1000).optional().describe('Number of items per page. Default: 10, Max: 1000.')
});

const PageInfoSchema = z.object({
    page: z.number(),
    page_size: z.number(),
    total_number: z.number(),
    total_page: z.number()
});

const AdGroupSchema = z
    .object({
        adgroup_id: z.string(),
        campaign_id: z.string().optional(),
        advertiser_id: z.string().optional(),
        adgroup_name: z.string().optional(),
        placement_type: z.string().optional(),
        budget: z.number().optional(),
        budget_mode: z.string().optional(),
        secondary_status: z.string().optional(),
        operation_status: z.string().optional(),
        optimization_goal: z.string().optional(),
        promotion_type: z.string().optional(),
        creative_material_mode: z.string().optional(),
        schedule_type: z.string().optional(),
        schedule_start_time: z.string().optional(),
        schedule_end_time: z.string().optional(),
        create_time: z.string().optional(),
        modify_time: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(AdGroupSchema),
    next_cursor: z.string().optional(),
    page_info: PageInfoSchema.optional()
});

const action = createAction({
    description: 'List ad groups from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-ad-groups',
        group: 'Ad Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer'
            });
        }

        const filtering: Record<string, unknown> = {};
        if (input.campaign_ids && input.campaign_ids.length > 0) {
            filtering['campaign_ids'] = input.campaign_ids;
        }
        if (input.adgroup_ids && input.adgroup_ids.length > 0) {
            filtering['adgroup_ids'] = input.adgroup_ids;
        }
        if (input.primary_status) {
            filtering['primary_status'] = input.primary_status;
        }

        const params: Record<string, string | number> = {
            advertiser_id: input.advertiser_id,
            page: page,
            page_size: input.page_size ?? 10
        };

        if (Object.keys(filtering).length > 0) {
            params['filtering'] = JSON.stringify(filtering);
        }

        // https://business-api.tiktok.com/portal/docs?id=1739314558673922
        const response = await nango.get({
            endpoint: 'adgroup/get/',
            params: params,
            retries: 3
        });

        const wrapper = z
            .object({
                code: z.number().optional(),
                message: z.string().optional(),
                data: z
                    .object({
                        list: z.array(z.unknown()),
                        page_info: PageInfoSchema.optional()
                    })
                    .optional()
            })
            .parse(response.data);

        if (wrapper.code !== undefined && wrapper.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: wrapper.message || 'TikTok API returned an error',
                code: wrapper.code
            });
        }

        const data = wrapper.data;
        if (!data) {
            return {
                items: [],
                page_info: { page: page, page_size: input.page_size ?? 10, total_number: 0, total_page: 0 }
            };
        }

        const items = data.list.map((item: unknown) => AdGroupSchema.parse(item));

        const pageInfo = data.page_info;
        const nextCursor = pageInfo && pageInfo.page < pageInfo.total_page ? String(pageInfo.page + 1) : undefined;

        return {
            items: items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor }),
            ...(pageInfo !== undefined && { page_info: pageInfo })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
