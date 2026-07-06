import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Campaign ID. Example: "ec8dae2c-8bd3-461d-90db-a8d262719b5f"')
});

const ProviderCampaignSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.number(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    campaign_schedule: z
        .object({
            start_date: z.string().nullable().optional(),
            end_date: z.string().nullable().optional(),
            schedules: z.array(
                z.object({
                    name: z.string(),
                    timing: z.object({
                        from: z.string(),
                        to: z.string()
                    }),
                    days: z.record(z.string(), z.boolean()),
                    timezone: z.string()
                })
            )
        })
        .optional(),
    sequences: z
        .array(
            z.object({
                steps: z.array(z.record(z.string(), z.unknown()))
            })
        )
        .optional(),
    email_list: z.array(z.string()).optional(),
    daily_limit: z.number().nullable().optional(),
    stop_on_reply: z.boolean().nullable().optional(),
    link_tracking: z.boolean().nullable().optional(),
    open_tracking: z.boolean().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.number(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    campaign_schedule: z
        .object({
            start_date: z.string().optional(),
            end_date: z.string().optional(),
            schedules: z.array(
                z.object({
                    name: z.string(),
                    timing: z.object({
                        from: z.string(),
                        to: z.string()
                    }),
                    days: z.record(z.string(), z.boolean()),
                    timezone: z.string()
                })
            )
        })
        .optional(),
    sequences: z
        .array(
            z.object({
                steps: z.array(z.record(z.string(), z.unknown()))
            })
        )
        .optional(),
    email_list: z.array(z.string()).optional(),
    daily_limit: z.number().optional(),
    stop_on_reply: z.boolean().optional(),
    link_tracking: z.boolean().optional(),
    open_tracking: z.boolean().optional()
});

const action = createAction({
    description: 'Activate or resume a campaign',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/activate-campaign',
        method: 'POST'
    },
    scopes: ['campaigns:update'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/campaign/activatestart-or-resume-a-campaign
            endpoint: `/v2/campaigns/${encodeURIComponent(input.id)}/activate`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found or could not be activated',
                campaign_id: input.id
            });
        }

        const providerCampaign = ProviderCampaignSchema.parse(response.data);

        return {
            id: providerCampaign.id,
            name: providerCampaign.name,
            status: providerCampaign.status,
            ...(providerCampaign.timestamp_created !== undefined && { timestamp_created: providerCampaign.timestamp_created }),
            ...(providerCampaign.timestamp_updated !== undefined && { timestamp_updated: providerCampaign.timestamp_updated }),
            ...(providerCampaign.campaign_schedule !== undefined && {
                campaign_schedule: {
                    ...(providerCampaign.campaign_schedule.start_date !== undefined &&
                        providerCampaign.campaign_schedule.start_date !== null && {
                            start_date: providerCampaign.campaign_schedule.start_date
                        }),
                    ...(providerCampaign.campaign_schedule.end_date !== undefined &&
                        providerCampaign.campaign_schedule.end_date !== null && {
                            end_date: providerCampaign.campaign_schedule.end_date
                        }),
                    schedules: providerCampaign.campaign_schedule.schedules
                }
            }),
            ...(providerCampaign.sequences !== undefined && { sequences: providerCampaign.sequences }),
            ...(providerCampaign.email_list !== undefined && { email_list: providerCampaign.email_list }),
            ...(providerCampaign.daily_limit !== undefined && providerCampaign.daily_limit !== null && { daily_limit: providerCampaign.daily_limit }),
            ...(providerCampaign.stop_on_reply !== undefined && providerCampaign.stop_on_reply !== null && { stop_on_reply: providerCampaign.stop_on_reply }),
            ...(providerCampaign.link_tracking !== undefined && providerCampaign.link_tracking !== null && { link_tracking: providerCampaign.link_tracking }),
            ...(providerCampaign.open_tracking !== undefined && providerCampaign.open_tracking !== null && { open_tracking: providerCampaign.open_tracking })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
