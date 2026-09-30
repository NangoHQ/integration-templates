import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaign_id: z.string().describe('The unique ID of the email campaign to update. Example: "192740f0-1bcc-4a57-b554-84e08e676829"'),
        name: z.string().min(1).describe('The new campaign-level name for the email campaign. Example: "September Product Newsletter"')
    })
    .describe('Campaign update input');

const CampaignActivitySchema = z
    .object({
        campaign_activity_id: z.string().describe('The unique ID of the campaign activity. Example: "78fe183c-1b46-457f-8bb5-cec72cee330e"'),
        role: z.string().describe('The role of the activity within the campaign, such as "primary_email" or "permalink"')
    })
    .describe('A campaign activity attached to the campaign');

const OutputSchema = z
    .object({
        campaign_id: z.string().describe('The unique ID of the updated email campaign. Example: "192740f0-1bcc-4a57-b554-84e08e676829"'),
        name: z.string().describe('The updated campaign-level name of the email campaign'),
        current_status: z.string().optional().describe('The current status of the campaign, such as "Draft", "Scheduled", or "Sent"'),
        type: z.string().optional().describe('The campaign type, such as "NEWSLETTER" or "CUSTOM_CODE_EMAIL"'),
        type_code: z.number().optional().describe('The numeric campaign type code. Example: 10'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the campaign was created. Example: "2026-09-29T18:36:18.405Z"'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the campaign was last updated. Example: "2026-09-29T18:36:18.405Z"'),
        campaign_activities: z
            .array(CampaignActivitySchema)
            .optional()
            .describe('The activities attached to the campaign, including the primary email and permalink')
    })
    .describe('The updated email campaign');

const ProviderCampaignSchema = z.object({
    campaign_id: z.string(),
    name: z.string(),
    current_status: z.string().optional(),
    type: z.string().optional(),
    type_code: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    campaign_activities: z
        .array(
            z.object({
                campaign_activity_id: z.string(),
                role: z.string(),
                document_id: z.string().optional()
            })
        )
        .optional()
});

/**
 * @tags: [write]
 * @tagReason: Patches the campaign's metadata on the provider without reading or deleting anything.
 * @pitfalls: Only the campaign name can be changed here; a campaign's subject, content, and audience live on its separate campaign activities and must be updated there instead.
 */
const action = createAction({
    description: 'Rename a campaign or change its campaign-level metadata.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: `/v3/emails/${encodeURIComponent(input.campaign_id)}`,
            data: {
                name: input.name
            },
            retries: 3
        };

        const response = await nango.patch(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found',
                campaign_id: input.campaign_id
            });
        }

        const campaign = ProviderCampaignSchema.parse(response.data);

        return {
            campaign_id: campaign.campaign_id,
            name: campaign.name,
            ...(campaign.current_status !== undefined && { current_status: campaign.current_status }),
            ...(campaign.type !== undefined && { type: campaign.type }),
            ...(campaign.type_code !== undefined && { type_code: campaign.type_code }),
            ...(campaign.created_at !== undefined && { created_at: campaign.created_at }),
            ...(campaign.updated_at !== undefined && { updated_at: campaign.updated_at }),
            ...(campaign.campaign_activities !== undefined && {
                campaign_activities: campaign.campaign_activities.map((activity) => ({
                    campaign_activity_id: activity.campaign_activity_id,
                    role: activity.role
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
