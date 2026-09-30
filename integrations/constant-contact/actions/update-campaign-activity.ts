import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaign_activity_id: z
            .string()
            .describe(
                'ID of the campaign activity to update. Found on the parent campaign\'s campaign_activities array, typically the entry with role "primary_email". Example: "2979c38c-221b-4a03-a3b2-c52310f60f35"'
            ),
        subject: z.string().optional().describe('Email subject line. Omit to keep the current subject.'),
        preheader: z
            .string()
            .nullable()
            .optional()
            .describe('Email preheader (preview text shown by inbox clients). Omit to keep the current value; send null to clear it.'),
        from_email: z
            .string()
            .optional()
            .describe('Email address the campaign is sent from. Omit to keep the current value. Example: "newsletter@example.com"'),
        from_name: z.string().optional().describe('Display name the campaign is sent from. Omit to keep the current value.'),
        reply_to_email: z.string().optional().describe('Email address that receives replies. Omit to keep the current value. Example: "support@example.com"'),
        format_type: z
            .number()
            .int()
            .optional()
            .describe('Numeric Constant Contact email format type (e.g. 5 for a custom-code email). Omit to keep the current value.'),
        contact_list_ids: z
            .array(z.string())
            .optional()
            .describe(
                'IDs of the contact lists the campaign sends to. Omit to keep the current audience; send an empty array to clear it. Must be non-empty before the campaign can be scheduled.'
            ),
        segment_ids: z
            .array(z.string())
            .optional()
            .describe('IDs of the segments the campaign sends to. Omit to keep the current value; send an empty array to clear it.')
    })
    .describe('Fields to update on the campaign activity. Omitted fields keep their current values.');

const OutputSchema = z
    .object({
        campaign_activity_id: z.string().describe('ID of the updated campaign activity.'),
        campaign_id: z.string().describe('ID of the parent email campaign.'),
        role: z.string().optional().describe('Role of the activity within the campaign, e.g. "primary_email" or "permalink".'),
        current_status: z.string().optional().describe('Status of the campaign activity, e.g. "DRAFT" or "SCHEDULED".'),
        format_type: z.number().optional().describe('Numeric Constant Contact email format type of the activity content.'),
        from_email: z.string().optional().describe('Email address the campaign is sent from.'),
        from_name: z.string().optional().describe('Display name the campaign is sent from.'),
        reply_to_email: z.string().optional().describe('Email address that receives replies.'),
        subject: z.string().optional().describe('Email subject line.'),
        preheader: z.string().optional().describe('Email preheader (preview text). Absent when not set.'),
        contact_list_ids: z.array(z.string()).describe('IDs of the contact lists the campaign sends to.'),
        segment_ids: z.array(z.string()).describe('IDs of the segments the campaign sends to.'),
        document_id: z.string().optional().describe('ID of the Constant Contact document holding the email body content.')
    })
    .describe('The updated campaign activity.');

const ProviderCampaignActivitySchema = z.object({
    campaign_activity_id: z.string(),
    campaign_id: z.string(),
    role: z.string().optional(),
    current_status: z.string().optional(),
    format_type: z.number().optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    reply_to_email: z.string().optional(),
    subject: z.string().optional(),
    preheader: z.string().optional(),
    contact_list_ids: z.array(z.string()).optional(),
    segment_ids: z.array(z.string()).optional(),
    document_id: z.string().optional()
});

/**
 * @tags: [read, write]
 * @tagReason: Reads the current campaign activity to preserve fields the caller omits, then writes the merged update to the provider.
 * @pitfalls: Updating an activity whose campaign is currently scheduled fails with a provider error, yet the change may still be partially applied; unschedule the campaign before editing it. The provider does not validate from_email or reply_to_email at update time, so unverified sender addresses are accepted without an error.
 */
const action = createAction({
    description: "Update a campaign activity's email content and/or target contact lists.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaign_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const getConfig: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html (Email Campaigns: GET /emails/activities/{campaign_activity_id})
            endpoint: `/v3/emails/activities/${encodeURIComponent(input.campaign_activity_id)}`,
            retries: 3
        };
        const currentResponse = await nango.get(getConfig);
        const current = ProviderCampaignActivitySchema.parse(currentResponse.data);

        // The provider requires these four fields on every update, so fall back
        // to the activity's current values when the caller omits them.
        const fromEmail = input.from_email ?? current.from_email;
        if (fromEmail === undefined) {
            throw new nango.ActionError({
                type: 'missing_required_field',
                message: 'Constant Contact requires from_email on every campaign activity update and the current activity has none; provide from_email.',
                field: 'from_email'
            });
        }
        const fromName = input.from_name ?? current.from_name;
        if (fromName === undefined) {
            throw new nango.ActionError({
                type: 'missing_required_field',
                message: 'Constant Contact requires from_name on every campaign activity update and the current activity has none; provide from_name.',
                field: 'from_name'
            });
        }
        const replyToEmail = input.reply_to_email ?? current.reply_to_email;
        if (replyToEmail === undefined) {
            throw new nango.ActionError({
                type: 'missing_required_field',
                message:
                    'Constant Contact requires reply_to_email on every campaign activity update and the current activity has none; provide reply_to_email.',
                field: 'reply_to_email'
            });
        }
        const subject = input.subject ?? current.subject;
        if (subject === undefined) {
            throw new nango.ActionError({
                type: 'missing_required_field',
                message: 'Constant Contact requires subject on every campaign activity update and the current activity has none; provide subject.',
                field: 'subject'
            });
        }

        const formatType = input.format_type ?? current.format_type;
        const preheader = input.preheader !== undefined ? input.preheader : current.preheader;

        const putConfig: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html (Email Campaigns: PUT /emails/activities/{campaign_activity_id})
            endpoint: `/v3/emails/activities/${encodeURIComponent(input.campaign_activity_id)}`,
            data: {
                ...(formatType !== undefined && { format_type: formatType }),
                from_email: fromEmail,
                from_name: fromName,
                reply_to_email: replyToEmail,
                subject: subject,
                ...(preheader !== undefined && { preheader: preheader }),
                contact_list_ids: input.contact_list_ids ?? current.contact_list_ids ?? [],
                segment_ids: input.segment_ids ?? current.segment_ids ?? []
            },
            // PUT applies an absolute set of values, so repeating it after a lost response is safe
            retries: 3
        };
        const response = await nango.put(putConfig);
        const updated = ProviderCampaignActivitySchema.parse(response.data);

        return {
            campaign_activity_id: updated.campaign_activity_id,
            campaign_id: updated.campaign_id,
            ...(updated.role !== undefined && { role: updated.role }),
            ...(updated.current_status !== undefined && { current_status: updated.current_status }),
            ...(updated.format_type !== undefined && { format_type: updated.format_type }),
            ...(updated.from_email !== undefined && { from_email: updated.from_email }),
            ...(updated.from_name !== undefined && { from_name: updated.from_name }),
            ...(updated.reply_to_email !== undefined && { reply_to_email: updated.reply_to_email }),
            ...(updated.subject !== undefined && { subject: updated.subject }),
            ...(updated.preheader !== undefined && { preheader: updated.preheader }),
            contact_list_ids: updated.contact_list_ids ?? [],
            segment_ids: updated.segment_ids ?? [],
            ...(updated.document_id !== undefined && { document_id: updated.document_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
