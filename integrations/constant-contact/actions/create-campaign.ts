import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const EmailCampaignActivityInputSchema = z.object({
    format_type: z
        .number()
        .int()
        .min(1)
        .max(5)
        .describe('Email format type (1-5). Use 5 for a custom-code email whose body you supply as full HTML. Example: 5'),
    from_name: z.string().describe('Display name shown as the sender of the email. Example: "Acme Inc."'),
    from_email: z.email().describe('Sender email address used in the From header. Example: "newsletter@acme.com"'),
    reply_to_email: z.email().describe('Email address that receives replies from recipients. Example: "support@acme.com"'),
    subject: z.string().describe('Subject line of the email. Example: "Your September newsletter"'),
    preheader: z.string().describe('Preheader text shown in the inbox preview after the subject. Example: "News and updates from Acme"'),
    html_content: z.string().optional().describe('Full HTML body of the email. Recommended when format_type is 5 (custom code).'),
    text_content: z.string().optional().describe('Plain-text body of the email, used as a fallback for clients that do not render HTML.'),
    contact_list_ids: z
        .array(z.string())
        .optional()
        .describe(
            'IDs of the contact lists that make up the campaign audience. Required before the campaign can be scheduled. Example: ["8f4c1f3a-bc12-11f1-aa3a-02420a320002"]'
        )
});

const InputSchema = z
    .object({
        name: z.string().describe('Internal name of the email campaign, not shown to recipients. Example: "September Newsletter"'),
        email_campaign_activities: z
            .array(EmailCampaignActivityInputSchema)
            .min(1)
            .describe('Email activities to create with the campaign, carrying the sender details and initial email content.')
    })
    .describe('Campaign name plus the email activities that hold the initial email content.');

const CampaignActivityOutputSchema = z.object({
    campaign_activity_id: z.string().describe('ID of the generated campaign activity. Example: "a0570af3-3749-4e15-8b28-4ab5924bb4a8"'),
    role: z.string().describe('Role of the activity within the campaign, e.g. "primary_email" or "permalink".'),
    document_id: z.string().optional().describe('ID of the underlying email content document that holds the body of this activity.')
});

const OutputSchema = z
    .object({
        campaign_id: z.string().describe('ID of the created campaign. Example: "8c7ebac1-b9c8-45cc-b7de-4bce3b20383b"'),
        name: z.string().describe('Internal name of the campaign.'),
        type: z.string().describe('Campaign email type derived from format_type, e.g. "CUSTOM_CODE_EMAIL".'),
        type_code: z.number().optional().describe('Numeric code of the campaign email type. Example: 26'),
        current_status: z.string().describe('Current status of the campaign, e.g. "Draft".'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format. Example: "2026-09-29T18:36:45.690Z"'),
        updated_at: z.string().describe('Last update timestamp in ISO 8601 format. Example: "2026-09-29T18:36:45.690Z"'),
        campaign_activities: z.array(CampaignActivityOutputSchema).describe('Generated campaign activities (primary_email and permalink).')
    })
    .describe('The created email campaign, including the generated campaign activities.');

/**
 * @tags: [write]
 * @tagReason: Creates a new email campaign in the provider account and does not read or delete provider data.
 * @pitfalls: The campaign is created in Draft status and is never sent by this action; it must be scheduled separately, and scheduling fails until the campaign activity has an audience (contact_list_ids). Campaign names must be unique per account and a deleted campaign's name stays reserved, so reusing a previously used name fails with a 409 conflict. from_email and reply_to_email are not validated at creation time; any address is accepted.
 */
const action = createAction({
    description: 'Create an email campaign with its initial email content.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/emails',
            data: {
                name: input.name,
                email_campaign_activities: input.email_campaign_activities.map((activity) => ({
                    format_type: activity.format_type,
                    from_name: activity.from_name,
                    from_email: activity.from_email,
                    reply_to_email: activity.reply_to_email,
                    subject: activity.subject,
                    preheader: activity.preheader,
                    ...(activity.html_content !== undefined && { html_content: activity.html_content }),
                    ...(activity.text_content !== undefined && { text_content: activity.text_content }),
                    ...(activity.contact_list_ids !== undefined && { contact_list_ids: activity.contact_list_ids })
                }))
            },
            // No retries: creating a campaign is not idempotent, so retrying after a lost response could create a duplicate campaign.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        const response = await nango.post(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
