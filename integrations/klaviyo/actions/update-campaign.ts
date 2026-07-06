import { z } from 'zod';
import { createAction } from 'nango';

const TrackingParamSchema = z.object({
    type: z.union([z.literal('dynamic'), z.literal('static')]),
    value: z.string(),
    name: z.string()
});

const EmailTrackingOptionsSchema = z.object({
    add_tracking_params: z.boolean().nullable().optional(),
    custom_tracking_params: z.array(TrackingParamSchema).nullable().optional(),
    is_tracking_clicks: z.boolean().nullable().optional(),
    is_tracking_opens: z.boolean().nullable().optional()
});

const SMSTrackingOptionsSchema = z.object({
    add_tracking_params: z.boolean().nullable().optional(),
    custom_tracking_params: z.array(TrackingParamSchema).nullable().optional()
});

const TrackingOptionsSchema = z.union([EmailTrackingOptionsSchema, SMSTrackingOptionsSchema]).nullable().optional();

const SendOptionsSchema = z
    .object({
        use_smart_sending: z.boolean().nullable().optional()
    })
    .nullable()
    .optional();

const StaticSendStrategySchema = z.object({
    method: z.literal('static'),
    datetime: z.string(),
    options: z
        .object({
            is_local: z.boolean(),
            send_past_recipients_immediately: z.boolean().optional()
        })
        .nullable()
        .optional()
});

const ImmediateSendStrategySchema = z.object({
    method: z.literal('immediate')
});

const ThrottledSendStrategySchema = z.object({
    method: z.literal('throttled'),
    datetime: z.string(),
    throttle_percentage: z.number()
});

const SmartSendTimeStrategySchema = z.object({
    method: z.literal('smart_send_time'),
    date: z.string()
});

const ABTestSendStrategySchema = z.object({
    method: z.literal('ab_test_campaign')
});

const SendStrategySchema = z
    .union([StaticSendStrategySchema, ImmediateSendStrategySchema, ThrottledSendStrategySchema, SmartSendTimeStrategySchema, ABTestSendStrategySchema])
    .nullable()
    .optional();

const AudiencesUpdateSchema = z
    .object({
        included: z.array(z.string()).nullable().optional(),
        excluded: z.array(z.string()).nullable().optional()
    })
    .nullable()
    .optional();

const InputSchema = z.object({
    id: z.string().describe('The campaign ID to update. Example: "01KWGH6P9PERJ0AHGNBJQMH55G"'),
    name: z.string().nullable().optional().describe('The campaign name. Set to null to clear.'),
    audiences: AudiencesUpdateSchema.describe('The audiences to include and/or exclude. Set to null to clear.'),
    send_strategy: SendStrategySchema.describe('The send strategy for the campaign. Set to null to clear.'),
    send_options: SendOptionsSchema.describe('Options to use when sending the campaign. Set to null to clear.'),
    tracking_options: TrackingOptionsSchema.describe('The tracking options associated with the campaign. Set to null to clear.')
});

const CampaignMessageRelationshipSchema = z.object({
    type: z.string(),
    id: z.string()
});

const TagRelationshipSchema = z.object({
    type: z.string(),
    id: z.string()
});

const CampaignAttributesSchema = z.object({
    name: z.string(),
    status: z.string(),
    archived: z.boolean(),
    audiences: z.object({
        included: z.array(z.string()),
        excluded: z.array(z.string()).nullable().optional()
    }),
    send_options: z.unknown(),
    tracking_options: z.unknown().nullable().optional(),
    send_strategy: z.unknown(),
    created_at: z.string(),
    scheduled_at: z.string().nullable().optional(),
    updated_at: z.string(),
    send_time: z.string().nullable().optional()
});

const CampaignDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: CampaignAttributesSchema,
    relationships: z
        .object({
            'campaign-messages': z
                .object({
                    data: z.array(CampaignMessageRelationshipSchema).optional()
                })
                .optional(),
            tags: z
                .object({
                    data: z.array(TagRelationshipSchema).optional()
                })
                .optional()
        })
        .optional(),
    links: z
        .object({
            self: z.string()
        })
        .optional()
});

const PatchCampaignResponseSchema = z.object({
    data: CampaignDataSchema,
    links: z
        .object({
            self: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    archived: z.boolean(),
    audiences: z
        .object({
            included: z.array(z.string()),
            excluded: z.array(z.string()).nullable().optional()
        })
        .optional(),
    send_strategy: z.unknown().optional(),
    send_options: z.unknown().optional(),
    tracking_options: z.unknown().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    scheduled_at: z.string().nullable().optional(),
    send_time: z.string().nullable().optional(),
    campaign_message_ids: z.array(z.string()).optional(),
    tag_ids: z.array(z.string()).optional()
});

const action = createAction({
    description: "Update a campaign's name, audiences, or send strategy.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/update_campaign
        const response = await nango.patch({
            endpoint: '/api/campaigns/' + encodeURIComponent(input.id),
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'campaign',
                    id: input.id,
                    attributes: {
                        ...(input.name !== undefined && { name: input.name }),
                        ...(input.audiences !== undefined && { audiences: input.audiences }),
                        ...(input.send_strategy !== undefined && { send_strategy: input.send_strategy }),
                        ...(input.send_options !== undefined && { send_options: input.send_options }),
                        ...(input.tracking_options !== undefined && { tracking_options: input.tracking_options })
                    }
                }
            },
            retries: 3
        });

        const parsed = PatchCampaignResponseSchema.parse(response.data);

        return {
            id: parsed.data.id,
            name: parsed.data.attributes.name,
            status: parsed.data.attributes.status,
            archived: parsed.data.attributes.archived,
            ...(parsed.data.attributes.audiences !== undefined && {
                audiences: {
                    included: parsed.data.attributes.audiences.included,
                    ...(parsed.data.attributes.audiences.excluded !== undefined && {
                        excluded: parsed.data.attributes.audiences.excluded
                    })
                }
            }),
            ...(parsed.data.attributes.send_strategy !== undefined && { send_strategy: parsed.data.attributes.send_strategy }),
            ...(parsed.data.attributes.send_options !== undefined && { send_options: parsed.data.attributes.send_options }),
            ...(parsed.data.attributes.tracking_options !== undefined && { tracking_options: parsed.data.attributes.tracking_options }),
            ...(parsed.data.attributes.created_at !== undefined && { created_at: parsed.data.attributes.created_at }),
            ...(parsed.data.attributes.updated_at !== undefined && { updated_at: parsed.data.attributes.updated_at }),
            ...(parsed.data.attributes.scheduled_at !== undefined && { scheduled_at: parsed.data.attributes.scheduled_at }),
            ...(parsed.data.attributes.send_time !== undefined && { send_time: parsed.data.attributes.send_time }),
            ...(parsed.data.relationships !== undefined &&
                parsed.data.relationships['campaign-messages'] !== undefined &&
                parsed.data.relationships['campaign-messages'].data !== undefined && {
                    campaign_message_ids: parsed.data.relationships['campaign-messages'].data.map((m) => m.id)
                }),
            ...(parsed.data.relationships !== undefined &&
                parsed.data.relationships.tags !== undefined &&
                parsed.data.relationships.tags.data !== undefined && {
                    tag_ids: parsed.data.relationships.tags.data.map((t) => t.id)
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
