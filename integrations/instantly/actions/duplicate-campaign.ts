import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Campaign ID to duplicate. Example: "9b6f458e-6dc5-4762-83d5-a528aedd2235"')
});

const CampaignScheduleItemSchema = z
    .object({
        timezone: z.string().optional(),
        days: z.unknown().optional(),
        start_time: z.string().optional(),
        end_time: z.string().optional(),
        sending_account_email: z.string().optional(),
        sending_account_id: z.string().optional()
    })
    .passthrough();

const CampaignScheduleSchema = z
    .object({
        schedules: z.array(CampaignScheduleItemSchema).optional(),
        sending_gap: z.unknown().optional(),
        sending_volume: z.unknown().optional(),
        stop_on_reply: z.boolean().optional()
    })
    .passthrough();

const CampaignSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        status: z.number(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        org_id: z.string().optional(),
        user_id: z.string().optional(),
        campaign_schedule: CampaignScheduleSchema.optional(),
        custom_variables: z.array(z.string()).optional(),
        list_id: z.string().optional(),
        list_name: z.string().optional()
    })
    .passthrough();

const OutputSchema = CampaignSchema;

const action = createAction({
    description: 'Duplicate a campaign',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/groups/campaign
            endpoint: `/v2/campaigns/${encodeURIComponent(input.id)}/duplicate`,
            retries: 10
        };

        const response = await nango.post(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from duplicate campaign endpoint'
            });
        }

        const campaign = CampaignSchema.parse(response.data);

        return campaign;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
