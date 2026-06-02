import { z } from 'zod';
import { createAction } from 'nango';

const IdentityInfoSchema = z.object({
    identity_id: z.string().describe('Identity ID. Example: "123"'),
    identity_type: z.string().describe('Identity type. Example: "CUSTOMIZED_USER"'),
    identity_authorized_bc_id: z.string().optional(),
    identity_authorized_shop_id: z.string().optional(),
    store_id: z.string().optional()
});

const CustomAnchorVideoListSchema = z.object({
    item_id: z.string().optional(),
    spu_id_list: z.array(z.string()).optional(),
    identity_info: IdentityInfoSchema.optional()
});

const VideoInfoSchema = z.object({
    video_id: z.string().describe('Video ID. Example: "v123"')
});

const ItemListSchema = z.object({
    item_id: z.string().optional(),
    spu_id_list: z.array(z.string()).optional(),
    identity_info: IdentityInfoSchema.optional(),
    video_info: VideoInfoSchema.optional()
});

const CustomScheduleListSchema = z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    schedule_type: z.string().optional()
});

const PromotionDaysSchema = z.object({
    auto_schedule_enabled: z.boolean().optional(),
    is_enabled: z.boolean().optional(),
    roas_bid_multiplier: z.number().int().optional(),
    custom_schedule_list: z.array(CustomScheduleListSchema).optional()
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_id: z.string().describe('Campaign ID. Example: "1866249031553154"'),
    campaign_name: z.string().optional(),
    budget: z.number().optional(),
    auto_budget_enabled: z.boolean().optional(),
    affiliate_posts_enabled: z.boolean().optional(),
    roas_bid: z.number().optional(),
    schedule_end_time: z.string().optional(),
    schedule_type: z.string().optional(),
    item_group_ids: z.array(z.string()).optional(),
    custom_anchor_video_list: z.array(CustomAnchorVideoListSchema).optional(),
    item_list: z.array(ItemListSchema).optional(),
    promotion_days: PromotionDaysSchema.optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    data: z
        .object({
            campaign_id: z.string().optional()
        })
        .optional(),
    request_id: z.string().optional()
});

const OutputSchema = z.object({
    campaign_id: z.string().optional(),
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Update a GMV Max campaign in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-gmv-max-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads.read', 'ads.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        type UpdateBody = {
            advertiser_id: string;
            campaign_id: string;
            campaign_name?: string;
            budget?: number;
            auto_budget_enabled?: boolean;
            affiliate_posts_enabled?: boolean;
            roas_bid?: number;
            schedule_end_time?: string;
            schedule_type?: string;
            item_group_ids?: string[];
            custom_anchor_video_list?: z.infer<typeof CustomAnchorVideoListSchema>[];
            item_list?: z.infer<typeof ItemListSchema>[];
            promotion_days?: z.infer<typeof PromotionDaysSchema>;
        };

        const body: UpdateBody = {
            advertiser_id: input.advertiser_id,
            campaign_id: input.campaign_id
        };

        if (input.campaign_name !== undefined) {
            body.campaign_name = input.campaign_name;
        }
        if (input.budget !== undefined) {
            body.budget = input.budget;
        }
        if (input.auto_budget_enabled !== undefined) {
            body.auto_budget_enabled = input.auto_budget_enabled;
        }
        if (input.affiliate_posts_enabled !== undefined) {
            body.affiliate_posts_enabled = input.affiliate_posts_enabled;
        }
        if (input.roas_bid !== undefined) {
            body.roas_bid = input.roas_bid;
        }
        if (input.schedule_end_time !== undefined) {
            body.schedule_end_time = input.schedule_end_time;
        }
        if (input.schedule_type !== undefined) {
            body.schedule_type = input.schedule_type;
        }
        if (input.item_group_ids !== undefined) {
            body.item_group_ids = input.item_group_ids;
        }
        if (input.custom_anchor_video_list !== undefined) {
            body.custom_anchor_video_list = input.custom_anchor_video_list;
        }
        if (input.item_list !== undefined) {
            body.item_list = input.item_list;
        }
        if (input.promotion_days !== undefined) {
            body.promotion_days = input.promotion_days;
        }

        // https://business-api.tiktok.com/portal/docs?id=1822001009002497
        const response = await nango.post({
            endpoint: 'campaign/gmv_max/update/',
            data: body,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code,
                request_id: providerResponse.request_id
            });
        }

        return {
            code: providerResponse.code,
            message: providerResponse.message,
            ...(providerResponse.data?.campaign_id != null && {
                campaign_id: providerResponse.data.campaign_id
            }),
            ...(providerResponse.request_id != null && {
                request_id: providerResponse.request_id
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
