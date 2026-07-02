import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Campaign name. Example: "Summer Sale 2026"'),
    audience_ids: z.array(z.string().min(1)).min(1).describe('List or segment IDs to include in the audience. Example: ["XW53Ha"]'),
    channel: z.enum(['email', 'sms']).describe('Message channel. Example: "email"'),
    message_label: z.string().optional().describe('Label for the campaign message. Example: "Main message"'),
    send_time: z.string().optional().describe('ISO 8601 send datetime. If omitted, defaults to ~6 months in the future. Example: "2027-01-15T12:00:00+00:00"'),
    use_smart_sending: z.boolean().optional().describe('Whether to use smart sending. Defaults to true.'),
    is_tracking_opens: z.boolean().optional().describe('Whether to track opens. Defaults to true.'),
    is_tracking_clicks: z.boolean().optional().describe('Whether to track clicks. Defaults to true.')
});

const CampaignResponseSchema = z.object({
    data: z.object({
        type: z.string().optional(),
        id: z.string(),
        attributes: z
            .object({
                name: z.string().optional(),
                status: z.string().optional(),
                audiences: z
                    .object({
                        included: z.array(z.string()).optional()
                    })
                    .optional(),
                send_strategy: z
                    .object({
                        method: z.string().optional(),
                        datetime: z.string().optional()
                    })
                    .optional(),
                send_options: z
                    .object({
                        use_smart_sending: z.boolean().optional()
                    })
                    .optional(),
                tracking_options: z
                    .object({
                        is_tracking_opens: z.boolean().optional(),
                        is_tracking_clicks: z.boolean().optional()
                    })
                    .optional(),
                created_at: z.string().optional(),
                updated_at: z.string().optional()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a draft email or SMS campaign',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const defaultSendTime = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
        const sendTime = input.send_time || defaultSendTime;

        // https://developers.klaviyo.com/en/reference/create_campaign
        const response = await nango.post({
            endpoint: '/api/campaigns',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'campaign',
                    attributes: {
                        name: input.name,
                        audiences: {
                            included: input.audience_ids
                        },
                        send_strategy: {
                            method: 'static',
                            datetime: sendTime
                        },
                        send_options: {
                            use_smart_sending: input.use_smart_sending !== undefined ? input.use_smart_sending : true
                        },
                        ...(input.channel === 'email' && {
                            tracking_options: {
                                is_tracking_opens: input.is_tracking_opens !== undefined ? input.is_tracking_opens : true,
                                is_tracking_clicks: input.is_tracking_clicks !== undefined ? input.is_tracking_clicks : true
                            }
                        }),
                        'campaign-messages': {
                            data: [
                                {
                                    type: 'campaign-message',
                                    attributes: {
                                        definition: {
                                            channel: input.channel,
                                            ...(input.channel === 'email' && input.message_label !== undefined && { label: input.message_label })
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            },
            retries: 3
        });

        const parsed = CampaignResponseSchema.parse(response.data);
        const campaign = parsed.data;
        const attributes = campaign.attributes || {};

        return {
            id: campaign.id,
            ...(attributes.name !== undefined && { name: attributes.name }),
            ...(attributes.status !== undefined && { status: attributes.status }),
            ...(attributes.created_at !== undefined && { created_at: attributes.created_at }),
            ...(attributes.updated_at !== undefined && { updated_at: attributes.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
