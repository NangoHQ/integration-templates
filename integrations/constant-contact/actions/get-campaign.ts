import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaign_id: z.string().describe('The unique ID of the email campaign to retrieve. Example: "c3d4e5f6-a7b8-49c0-91d2-e3f4a5b6c7d8".')
    })
    .describe('Input for retrieving a single email campaign.');

const ProviderCampaignActivitySchema = z.object({
    campaign_activity_id: z.string(),
    role: z.string()
});

const ProviderCampaignSchema = z.object({
    campaign_id: z.string(),
    name: z.string(),
    current_status: z.string(),
    type: z.string(),
    type_code: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    campaign_activities: z.array(ProviderCampaignActivitySchema)
});

const CampaignActivitySchema = z.object({
    campaign_activity_id: z
        .string()
        .describe(
            'The unique ID of the campaign activity. Fetch it with get-campaign-activity to read subject, content, and sender details. Example: "2979c38c-221b-4a03-a3b2-c52310f60f35".'
        ),
    role: z.string().describe('The role of the campaign activity within the campaign, e.g. "primary_email" or "permalink".')
});

const OutputSchema = z
    .object({
        campaign_id: z.string().describe('The unique ID of the email campaign.'),
        name: z.string().describe('The name of the email campaign.'),
        current_status: z.string().describe('The current status of the campaign, e.g. "DRAFT", "SCHEDULED", or "SENT".'),
        type: z.string().describe('The campaign type, e.g. "NEWSLETTER".'),
        type_code: z.number().describe('The numeric code identifying the campaign type.'),
        created_at: z.string().describe('ISO 8601 timestamp of when the campaign was created. Example: "2026-09-29T14:34:37.000Z".'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the campaign was last updated. Example: "2026-09-29T14:34:37.000Z".'),
        campaign_activities: z
            .array(CampaignActivitySchema)
            .describe('The campaign activities belonging to this campaign, such as the primary_email and permalink activities.')
    })
    .describe('A single email campaign, including references to its campaign activities.');

/**
 * @tags: [read]
 * @tagReason: Fetches a single email campaign from the provider without modifying any provider data.
 * @pitfalls: Returns campaign metadata only; the subject, preheader, from address, and email content are not included and must be fetched separately for each activity referenced in campaign_activities.
 */
const action = createAction({
    description: 'Retrieve a single email campaign, including its campaign_activities (primary_email, permalink roles).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: `/v3/emails/${encodeURIComponent(input.campaign_id)}`,
            retries: 3
        };
        const response = await nango.get(config);

        const campaign = ProviderCampaignSchema.parse(response.data);

        return {
            campaign_id: campaign.campaign_id,
            name: campaign.name,
            current_status: campaign.current_status,
            type: campaign.type,
            type_code: campaign.type_code,
            created_at: campaign.created_at,
            updated_at: campaign.updated_at,
            campaign_activities: campaign.campaign_activities.map((activity) => ({
                campaign_activity_id: activity.campaign_activity_id,
                role: activity.role
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
