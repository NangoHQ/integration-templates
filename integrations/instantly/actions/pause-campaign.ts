import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Campaign ID. Example: "ec8dae2c-8bd3-461d-90db-a8d262719b5f"')
});

const ProviderCampaignScheduleSchema = z
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
    .passthrough();

const ProviderCampaignSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.number(),
    campaign_schedule: ProviderCampaignScheduleSchema,
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    email_list: z.array(z.string()).optional(),
    daily_limit: z.number().nullable().optional(),
    stop_on_reply: z.boolean().nullable().optional(),
    link_tracking: z.boolean().nullable().optional(),
    open_tracking: z.boolean().optional(),
    organization: z.string().nullable().optional(),
    owned_by: z.string().nullable().optional(),
    ai_sdr_id: z.string().nullable().optional(),
    custom_variables: z.record(z.string(), z.unknown()).nullable().optional(),
    core_variables: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.number(),
    campaign_schedule: ProviderCampaignScheduleSchema.optional(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    email_list: z.array(z.string()).optional(),
    daily_limit: z.number().optional(),
    stop_on_reply: z.boolean().optional(),
    link_tracking: z.boolean().optional(),
    open_tracking: z.boolean().optional(),
    organization: z.string().optional(),
    owned_by: z.string().optional(),
    ai_sdr_id: z.string().optional(),
    custom_variables: z.record(z.string(), z.unknown()).optional(),
    core_variables: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Pause a campaign',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:update'],
    endpoint: {
        path: '/actions/pause-campaign',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/groups/campaign
            endpoint: `/v2/campaigns/${encodeURIComponent(input.id)}/pause`,
            retries: 3
        };

        const response = await nango.post(config);

        const providerCampaign = ProviderCampaignSchema.parse(response.data);

        return {
            id: providerCampaign.id,
            name: providerCampaign.name,
            status: providerCampaign.status,
            ...(providerCampaign.campaign_schedule != null && { campaign_schedule: providerCampaign.campaign_schedule }),
            timestamp_created: providerCampaign.timestamp_created,
            timestamp_updated: providerCampaign.timestamp_updated,
            ...(providerCampaign.email_list != null && { email_list: providerCampaign.email_list }),
            ...(providerCampaign.daily_limit != null && { daily_limit: providerCampaign.daily_limit }),
            ...(providerCampaign.stop_on_reply != null && { stop_on_reply: providerCampaign.stop_on_reply }),
            ...(providerCampaign.link_tracking != null && { link_tracking: providerCampaign.link_tracking }),
            ...(providerCampaign.open_tracking != null && { open_tracking: providerCampaign.open_tracking }),
            ...(providerCampaign.organization != null && { organization: providerCampaign.organization }),
            ...(providerCampaign.owned_by != null && { owned_by: providerCampaign.owned_by }),
            ...(providerCampaign.ai_sdr_id != null && { ai_sdr_id: providerCampaign.ai_sdr_id }),
            ...(providerCampaign.custom_variables != null && { custom_variables: providerCampaign.custom_variables }),
            ...(providerCampaign.core_variables != null && { core_variables: providerCampaign.core_variables })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
