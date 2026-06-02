import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    adgroup_id: z.string().describe('Smart+ Ad Group ID. Example: "1866248800809074"'),
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            list: z.array(z.object({}).passthrough()),
            page_info: z
                .object({
                    page: z.number().optional(),
                    page_size: z.number().optional(),
                    total_number: z.number().optional(),
                    total_page: z.number().optional()
                })
                .optional()
        })
        .optional()
});

const OutputSchema = z
    .object({
        adgroup_id: z.string(),
        campaign_id: z.string(),
        advertiser_id: z.string(),
        adgroup_name: z.string().optional(),
        placement_type: z.string().optional(),
        placements: z.array(z.string()).optional(),
        budget: z.number().optional(),
        budget_mode: z.string().optional(),
        secondary_status: z.string().optional(),
        operation_status: z.string().optional(),
        optimization_goal: z.string().optional(),
        bid_type: z.string().optional(),
        bid_price: z.number().optional(),
        promotion_type: z.string().optional(),
        creative_material_mode: z.string().optional(),
        schedule_type: z.string().optional(),
        schedule_start_time: z.string().optional(),
        schedule_end_time: z.string().optional(),
        create_time: z.string().optional(),
        modify_time: z.string().optional(),
        pixel_id: z.string().optional(),
        app_id: z.string().optional(),
        billing_event: z.string().optional(),
        targeting_spec: z.object({}).passthrough().optional(),
        roas_bid: z.number().optional(),
        click_attribution_window: z.string().optional(),
        view_attribution_window: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve Smart+ ad group details from TikTok Ads',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-smart-plus-adgroup'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs/api-reference?id=1762596231051265
            endpoint: 'smart_plus/adgroup/get/',
            params: {
                advertiser_id: input.advertiser_id,
                filtering: JSON.stringify({ adgroup_ids: [input.adgroup_id] }),
                page_size: '1'
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'Unknown error from TikTok API',
                code: providerResponse.code
            });
        }

        const list = providerResponse.data?.list;
        if (!list || list.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Smart+ ad group ${input.adgroup_id} not found`
            });
        }

        const raw = list[0];
        if (raw === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response returned an empty list'
            });
        }

        if (typeof raw['adgroup_id'] !== 'string' || typeof raw['campaign_id'] !== 'string' || typeof raw['advertiser_id'] !== 'string') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response missing required ad group fields'
            });
        }

        const normalizeString = (value: unknown): string | undefined => {
            return typeof value === 'string' ? value : undefined;
        };

        const normalizeNumber = (value: unknown): number | undefined => {
            return typeof value === 'number' ? value : undefined;
        };

        const normalizeStringArray = (value: unknown): string[] | undefined => {
            return Array.isArray(value) && value.every((v) => typeof v === 'string') ? value : undefined;
        };

        const normalizeRecord = (value: unknown): Record<string, unknown> | undefined => {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                const result: Record<string, unknown> = {};
                for (const [key, val] of Object.entries(value)) {
                    result[key] = val;
                }
                return result;
            }
            return undefined;
        };

        const result = {
            ...raw,
            adgroup_id: raw['adgroup_id'],
            campaign_id: raw['campaign_id'],
            advertiser_id: raw['advertiser_id'],
            adgroup_name: normalizeString(raw['adgroup_name']),
            placement_type: normalizeString(raw['placement_type']),
            placements: normalizeStringArray(raw['placements']),
            budget: normalizeNumber(raw['budget']),
            budget_mode: normalizeString(raw['budget_mode']),
            secondary_status: normalizeString(raw['secondary_status']),
            operation_status: normalizeString(raw['operation_status']),
            optimization_goal: normalizeString(raw['optimization_goal']),
            bid_type: normalizeString(raw['bid_type']),
            bid_price: normalizeNumber(raw['bid_price']),
            promotion_type: normalizeString(raw['promotion_type']),
            creative_material_mode: normalizeString(raw['creative_material_mode']),
            schedule_type: normalizeString(raw['schedule_type']),
            schedule_start_time: normalizeString(raw['schedule_start_time']),
            schedule_end_time: normalizeString(raw['schedule_end_time']),
            create_time: normalizeString(raw['create_time']),
            modify_time: normalizeString(raw['modify_time']),
            pixel_id: normalizeString(raw['pixel_id']),
            app_id: normalizeString(raw['app_id']),
            billing_event: normalizeString(raw['billing_event']),
            targeting_spec: normalizeRecord(raw['targeting_spec']),
            roas_bid: normalizeNumber(raw['roas_bid']),
            click_attribution_window: normalizeString(raw['click_attribution_window']),
            view_attribution_window: normalizeString(raw['view_attribution_window'])
        };

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
