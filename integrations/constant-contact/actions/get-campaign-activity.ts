import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaign_activity_id: z
            .string()
            .describe(
                'The unique ID of the campaign activity to retrieve. Found in the campaign object\'s campaign_activities array. Example: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"'
            )
    })
    .describe('Input for retrieving a single campaign activity.');

const OutputSchema = z
    .object({
        campaign_activity_id: z.string().describe('The unique ID of the campaign activity.'),
        campaign_id: z.string().describe('The unique ID of the parent email campaign.'),
        role: z.string().describe('The role of this activity within the campaign, for example "primary_email" or "permalink".'),
        current_status: z.string().describe('The current status of the campaign activity, for example "DRAFT" or "SCHEDULED".'),
        subject: z.string().describe('The email subject line.'),
        preheader: z.string().nullable().optional().describe('The email preheader (preview text). Null when no preheader is set.'),
        from_email: z.string().describe('The verified sender email address the email is sent from.'),
        from_name: z.string().describe('The display name the email is sent from.'),
        reply_to_email: z.string().describe('The email address that receives replies to the campaign email.'),
        contact_list_ids: z.array(z.string()).describe('IDs of the contact lists the campaign email is addressed to.'),
        segment_ids: z.array(z.string()).describe('IDs of the segments the campaign email is addressed to.'),
        document_id: z.string().optional().describe('The ID of the email content document.')
    })
    .describe("A campaign activity's email content and settings.");

const ProviderCampaignActivitySchema = z.object({
    campaign_activity_id: z.string(),
    campaign_id: z.string(),
    role: z.string(),
    current_status: z.string(),
    subject: z.string(),
    preheader: z.string().nullable().optional(),
    from_email: z.string(),
    from_name: z.string(),
    reply_to_email: z.string(),
    contact_list_ids: z.array(z.string()),
    segment_ids: z.array(z.string()),
    document_id: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads a single campaign activity from the provider without mutating anything.
 * @pitfalls: A campaign's subject and sender details live on its activities, not on the campaign object, and a campaign can have multiple activities with different roles (e.g. primary_email, permalink), so pass the activity ID for the role you want. Draft activities can return a null preheader and empty contact_list_ids until content and audience are set.
 */
const action = createAction({
    description: "Retrieve a campaign activity's email content (subject, preheader, from/reply-to addresses, contact_list_ids, status).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: `/v3/emails/activities/${encodeURIComponent(input.campaign_activity_id)}`,
            retries: 3
        };
        const response = await nango.get(config);

        const activity = ProviderCampaignActivitySchema.parse(response.data);

        return {
            campaign_activity_id: activity.campaign_activity_id,
            campaign_id: activity.campaign_id,
            role: activity.role,
            current_status: activity.current_status,
            subject: activity.subject,
            ...(activity.preheader !== undefined && { preheader: activity.preheader }),
            from_email: activity.from_email,
            from_name: activity.from_name,
            reply_to_email: activity.reply_to_email,
            contact_list_ids: activity.contact_list_ids,
            segment_ids: activity.segment_ids,
            ...(activity.document_id !== undefined && { document_id: activity.document_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
