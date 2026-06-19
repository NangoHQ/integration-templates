import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_id: z.string().describe('The unique id for the campaign. Example: "a1b2c3d4e5"'),
    schedule_time: z.string().describe('The date and time to schedule the campaign in ISO 8601 format. Example: "2026-05-25T14:00:00Z"')
});

const ProviderCampaignSchema = z
    .object({
        id: z.string(),
        status: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    campaign_id: z.string(),
    status: z.string().optional(),
    schedule_time: z.string()
});

const action = createAction({
    description: 'Schedule a Mailchimp campaign send.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://mailchimp.com/developer/marketing/api/campaigns/schedule-campaign/
        const response = await nango.post({
            endpoint: `/3.0/campaigns/${encodeURIComponent(input.campaign_id)}/actions/schedule`,
            data: {
                schedule_time: input.schedule_time
            },
            retries: 10
        });

        if (response.data && typeof response.data === 'object') {
            const providerCampaign = ProviderCampaignSchema.parse(response.data);
            return {
                campaign_id: providerCampaign.id,
                status: providerCampaign.status,
                schedule_time: input.schedule_time
            };
        }

        return {
            campaign_id: input.campaign_id,
            schedule_time: input.schedule_time
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
