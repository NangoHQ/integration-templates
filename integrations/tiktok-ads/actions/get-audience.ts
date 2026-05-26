import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    audience_id: z.string().describe('Audience ID. Example: "1234567890"'),
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"')
});

const AudienceHistorySchema = z.object({
    action: z.string(),
    editor: z.string(),
    msg: z.string().nullable(),
    opt_time: z.string(),
    action_detail: z.string()
});

const AudienceDetailsSchema = z.object({
    audience_id: z.string(),
    name: z.string().nullable(),
    type: z.string().nullable(),
    cover_num: z.number().nullable(),
    is_valid: z.boolean().nullable(),
    is_expiring: z.boolean().nullable(),
    is_creator: z.boolean().nullable(),
    shared: z.boolean().nullable(),
    calculate_type: z.string().nullable(),
    create_time: z.string().nullable(),
    expired_time: z.string().nullable(),
    audience_sub_type: z.string().nullable().optional(),
    is_auto_refresh: z.boolean().nullable().optional(),
    audience_enhancement: z.boolean().nullable().optional(),
    enhancement_status: z.string().nullable().optional(),
    owner_id: z.string().nullable().optional(),
    lookalike_spec: z.unknown().nullable().optional(),
    rule: z.string().nullable().optional(),
    msg: z.string().nullable().optional(),
    error_msg: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z
        .object({
            list: z.array(
                z.object({
                    audience_history: z.array(AudienceHistorySchema),
                    audience_details: AudienceDetailsSchema
                })
            )
        })
        .optional()
});

const OutputSchema = z.object({
    audience_id: z.string(),
    name: z.string().optional(),
    audience_type: z.string().optional(),
    cover_num: z.number().optional(),
    is_valid: z.boolean().optional(),
    is_expiring: z.boolean().optional(),
    is_creator: z.boolean().optional(),
    shared: z.boolean().optional(),
    calculate_type: z.string().optional(),
    create_time: z.string().optional(),
    expired_time: z.string().optional(),
    audience_history: z.array(AudienceHistorySchema).optional()
});

const action = createAction({
    description: 'Retrieve a single audience from TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-audience',
        group: 'Audiences'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['audience_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://business-api.tiktok.com/portal/docs?id=1739940507792385
            endpoint: 'dmp/custom_audience/get/',
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            params: {
                advertiser_id: input.advertiser_id,
                custom_audience_ids: JSON.stringify([input.audience_id])
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message,
                code: parsed.code
            });
        }

        const item = parsed.data?.list[0];

        if (!item) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Audience not found',
                audience_id: input.audience_id
            });
        }

        const audience = item.audience_details;

        return {
            audience_id: audience.audience_id,
            ...(audience.name != null && { name: audience.name }),
            ...(audience.type != null && { audience_type: audience.type }),
            ...(audience.cover_num != null && { cover_num: audience.cover_num }),
            ...(audience.is_valid != null && { is_valid: audience.is_valid }),
            ...(audience.is_expiring != null && { is_expiring: audience.is_expiring }),
            ...(audience.is_creator != null && { is_creator: audience.is_creator }),
            ...(audience.shared != null && { shared: audience.shared }),
            ...(audience.calculate_type != null && { calculate_type: audience.calculate_type }),
            ...(audience.create_time != null && { create_time: audience.create_time }),
            ...(audience.expired_time != null && { expired_time: audience.expired_time }),
            audience_history: item.audience_history
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
