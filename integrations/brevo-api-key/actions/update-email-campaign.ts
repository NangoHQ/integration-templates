import { z } from 'zod';
import { createAction } from 'nango';

const SenderInputSchema = z.object({
    email: z
        .string()
        .optional()
        .describe('Sender email from which the campaign emails are sent. Pass either email or id, not both. Example: "newsletter@example.com"'),
    id: z.number().optional().describe('Id of the sender to select. Dedicated IP users should pass id instead of email. Example: 123'),
    name: z.string().optional().describe('Sender name shown to recipients. Example: "Newsletter"')
});

const RecipientsInputSchema = z.object({
    listIds: z
        .array(z.number())
        .optional()
        .describe('List ids to send the campaign to. Only update with listIds if listIds were used to create the campaign. Example: [2, 7]'),
    exclusionListIds: z.array(z.number()).optional().describe('List ids to exclude from the campaign. Example: [4]'),
    segmentIds: z
        .array(z.number())
        .optional()
        .describe('Segment ids to send the campaign to. Only update with segmentIds if segmentIds were used to create the campaign. Example: [12]'),
    exclusionSegmentIds: z.array(z.number()).optional().describe('Segment ids to exclude from the campaign. Example: [9]')
});

const InputSchema = z
    .object({
        campaignId: z.number().describe('Id of the email campaign to update. Example: 42'),
        name: z.string().optional().describe('New name of the campaign.'),
        subject: z.string().optional().describe('New subject of the campaign. Ignored when A/B testing is enabled on the campaign.'),
        htmlContent: z.string().optional().describe('New HTML body of the campaign message. Required if the campaign has no htmlUrl.'),
        sender: SenderInputSchema.optional().describe('New sender details. Pass either sender.email or sender.id, not both.'),
        recipients: RecipientsInputSchema.optional().describe('New recipient lists and segments to include in or exclude from the campaign.'),
        scheduledAt: z
            .string()
            .optional()
            .describe('New UTC date-time on which the campaign has to run (YYYY-MM-DDTHH:mm:ss.SSSZ). Example: "2026-12-31T09:00:00.000Z"'),
        status: z
            .enum(['draft', 'archive', 'suspended'])
            .optional()
            .describe('New status of the campaign. Only effective on draft campaigns; silently ignored on queued or sent campaigns.')
    })
    .describe('campaignId plus the subset of email campaign fields to update. At least one updatable field must be provided.');

const SenderOutputSchema = z.object({
    email: z.string().optional().describe('Sender email of the campaign.'),
    id: z.number().optional().describe('Sender id of the campaign.'),
    name: z.string().optional().describe('Sender name of the campaign.')
});

const RecipientsOutputSchema = z.object({
    lists: z.array(z.number()).describe('List ids the campaign is sent to.'),
    exclusionLists: z.array(z.number()).describe('List ids excluded from the campaign.'),
    segments: z.array(z.number()).optional().describe('Segment ids the campaign is sent to.'),
    excludedSegments: z.array(z.number()).optional().describe('Segment ids excluded from the campaign.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Id of the campaign.'),
        name: z.string().describe('Name of the campaign.'),
        subject: z.string().optional().describe('Subject of the campaign. Present when A/B testing is disabled.'),
        status: z
            .enum(['draft', 'sent', 'archive', 'queued', 'suspended', 'in_process', 'in_review', 'cancelling', 'cancelled'])
            .describe('Current status of the campaign.'),
        scheduledAt: z
            .string()
            .optional()
            .describe('UTC date-time on which the campaign is scheduled (YYYY-MM-DDTHH:mm:ss.SSSZ). Present only when the campaign is scheduled.'),
        sender: SenderOutputSchema.describe('Sender details of the campaign.'),
        recipients: RecipientsOutputSchema.describe('Recipient lists and segments of the campaign.'),
        createdAt: z.string().describe('Creation UTC date-time of the campaign (YYYY-MM-DDTHH:mm:ss.SSSZ).'),
        modifiedAt: z.string().describe('UTC date-time of last modification of the campaign (YYYY-MM-DDTHH:mm:ss.SSSZ).')
    })
    .describe('The email campaign as it stands after the update.');

/**
 * @tags: [read, write]
 * @tagReason: Updates an email campaign via a write call and reads back the updated campaign.
 * @pitfalls: Only draft or scheduled campaigns can be modified; updating a sent campaign fails. Setting status to draft/archive/suspended on a queued or sent campaign is silently accepted but has no effect, so a scheduled campaign cannot be reverted to draft. The scheduledAt output field can come back as an empty string rather than being absent when no schedule is set.
 */
const action = createAction({
    description: 'Update a draft or not-yet-sent email campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasUpdate =
            input.name !== undefined ||
            input.subject !== undefined ||
            input.htmlContent !== undefined ||
            input.sender !== undefined ||
            input.recipients !== undefined ||
            input.scheduledAt !== undefined ||
            input.status !== undefined;

        if (!hasUpdate) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one field to update: name, subject, htmlContent, sender, recipients, scheduledAt, or status.'
            });
        }

        const data = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.subject !== undefined && { subject: input.subject }),
            ...(input.htmlContent !== undefined && { htmlContent: input.htmlContent }),
            ...(input.sender !== undefined && { sender: input.sender }),
            ...(input.recipients !== undefined && { recipients: input.recipients }),
            ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
            ...(input.status !== undefined && { status: input.status })
        };

        // PUT is idempotent here: replaying the same body after a lost response yields the same campaign state.
        // https://developers.brevo.com/reference/update-email-campaign
        await nango.put({
            endpoint: `/emailCampaigns/${input.campaignId}`,
            data,
            retries: 3
        });

        // The update returns 204 No Content, so read the campaign back. HTML content is excluded to keep the response small.
        // https://developers.brevo.com/reference/get-email-campaign
        const response = await nango.get({
            endpoint: `/emailCampaigns/${input.campaignId}`,
            params: {
                excludeHtmlContent: 'true'
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
