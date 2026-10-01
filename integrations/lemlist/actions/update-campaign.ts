import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const aiReplyActionFields = {
    enabled: z.boolean().optional().describe('Enable this AI reply action.'),
    pauseAllCampaignsForLead: z.boolean().optional().describe('Pause all campaigns for this lead.'),
    pauseCampaignForCompany: z.boolean().optional().describe('Pause this campaign for other leads in the same company.'),
    pauseAllCampaignsForCompany: z.boolean().optional().describe('Pause all campaigns for leads in the same company.')
};

const updatableFields = {
    name: z.string().optional().describe('The campaign name.'),
    stopOnEmailReplied: z.boolean().optional().describe('Stop the campaign when a lead replies by email.'),
    stopOnMeetingBooked: z.boolean().optional().describe('Stop the campaign when a meeting is booked.'),
    stopOnLinkClicked: z.boolean().optional().describe('Stop the campaign when a link is clicked.'),
    leadsPausedByInterest: z.boolean().optional().describe('Pause leads based on interest.'),
    opportunityReplied: z.boolean().optional().describe('Create an opportunity when a lead replies.'),
    opportunityClicked: z.boolean().optional().describe('Create an opportunity when a lead clicks a link.'),
    autoLeadInterest: z.boolean().optional().describe('Automatically detect lead interest.'),
    disableTrackOpen: z.boolean().optional().describe('Disable tracking of email opens.'),
    disableTrackClick: z.boolean().optional().describe('Disable tracking of link clicks.'),
    disableTrackReply: z.boolean().optional().describe('Disable tracking of email replies.'),
    disableOutOfOffice: z.boolean().optional().describe('Disable out-of-office detection.'),
    sequenceSharing: z.boolean().optional().describe('Enable sequence sharing for the campaign.'),
    stopOnLinkClickedFilter: z.string().optional().describe('Filter for which link clicks should stop the campaign.'),
    sendUserIds: z
        .array(z.string())
        .optional()
        .describe(
            'User IDs (usr_xxx format) to assign as campaign senders. Cannot be used on campaigns with a dynamic sender strategy, and every sending channel of the campaign must be covered by at least one capable sender.'
        ),
    autoReview: z
        .boolean()
        .optional()
        .describe('Automatically launch (review) leads as soon as they are added to the campaign, instead of requiring manual review.'),
    autoReviewConditions: z
        .array(z.enum(['deliverable', 'risky', 'undeliverable', 'unverified']))
        .optional()
        .describe(
            'Email deliverability statuses for which a lead is auto-launched when autoReview is enabled. Allowed values: deliverable, risky, undeliverable, unverified.'
        ),
    aiFeatures: z
        .object({
            scoreReplies: z.boolean().optional().describe('Enable AI reply scoring for this campaign.'),
            onInterestedReply: z.object(aiReplyActionFields).optional().describe('AI action when a reply is detected as interested.'),
            onNotInterestedReply: z.object(aiReplyActionFields).optional().describe('AI action when a reply is detected as not interested.')
        })
        .optional()
        .describe('AI reply-handling settings. Provide only the flags to change; omitted flags keep their current value.'),
    tracking: z
        .object({
            trackOpens: z.boolean().optional().describe('Whether email open tracking is enabled.'),
            trackClicks: z.boolean().optional().describe('Whether link click tracking is enabled.'),
            trackReplies: z.boolean().optional().describe('Whether reply tracking is enabled.')
        })
        .optional()
        .describe('Open, click, and reply tracking toggles. Provide only the flags to change.'),
    onReplied: z
        .object({
            createNewTask: z.boolean().optional().describe('Create a task when a lead replies.'),
            campaignProgress: z.enum(['continue', 'pause', 'stop']).optional().describe('What happens to the lead on reply. One of: continue, pause, stop.'),
            propagateProgressToCompany: z.boolean().optional().describe('Apply the same action to other leads in the same company.'),
            disableOutOfOffice: z.boolean().optional().describe('Whether out-of-office detection is disabled.')
        })
        .optional()
        .describe('Behavior when a lead replies. Provide only the flags to change.'),
    onLinkClicked: z
        .object({
            createNewTask: z.boolean().optional().describe('Create a task when a lead clicks a link.'),
            campaignProgress: z
                .enum(['continue', 'pause', 'stop'])
                .optional()
                .describe('What happens to the lead on link click. One of: continue, pause, stop.'),
            propagateProgressToCompany: z.boolean().optional().describe('Apply the same action to other leads in the same company.'),
            specificLinks: z.array(z.string()).optional().describe('If non-empty, only these link URLs trigger the action. An empty list means all links.')
        })
        .optional()
        .describe('Behavior when a lead clicks a tracked link. Provide only the flags to change.'),
    onMeetingBooked: z
        .object({
            campaignProgress: z
                .enum(['continue', 'pause', 'stop'])
                .optional()
                .describe('What happens to the lead when a meeting is booked. One of: continue, pause, stop.'),
            propagateProgressToCompany: z.boolean().optional().describe('Apply the same action to other leads in the same company.')
        })
        .optional()
        .describe('Behavior when a meeting is booked. Provide only the flags to change.')
};

const InputSchema = z
    .object({
        campaignId: z.string().describe('The unique identifier of the campaign to update. Example: "cam_A1B2C3D4E5F6G7H8I9".'),
        ...updatableFields
    })
    .describe("Campaign fields to update. Partial merge: only the provided fields are changed. Provide at least one field besides 'campaignId'.");

const OutputSchema = z
    .object({
        ...updatableFields,
        sendUsers: z
            .array(
                z
                    .object({
                        id: z.string().optional().describe('User ID of the sender.'),
                        mailboxes: z
                            .array(
                                z
                                    .object({
                                        sendUserMailboxId: z.string().optional().describe('ID of the connected sender mailbox.'),
                                        email: z.string().optional().describe('Email address of the connected sender mailbox.')
                                    })
                                    .describe('A connected email mailbox of the sender.')
                            )
                            .optional()
                            .describe('Connected email mailboxes of the sender.'),
                        phoneNumbers: z.array(z.string()).optional().describe('Connected phone numbers of the sender.'),
                        whatsappAccountIds: z.array(z.string()).optional().describe('Connected WhatsApp account IDs of the sender.')
                    })
                    .describe('A configured sender for the campaign.')
            )
            .optional()
            .describe('Configured senders for the campaign. Only present when sendUserIds was provided in the request.')
    })
    .describe('The campaign fields that were updated. The response only echoes the fields that were sent, not the full campaign object.');

/**
 * @tags: [write]
 * @tagReason: Mutates a lemlist campaign by PATCHing the provided fields to it.
 * @pitfalls: The response echoes only the fields that were sent, not the full campaign object; follow up with list-campaigns or get-campaign for the complete updated campaign. When setting sendUserIds, senders lacking capabilities for the campaign's sending channels are silently excluded from the update.
 */
const action = createAction({
    description: "Update a campaign's fields (e.g. rename it). Partial merge: only the fields you send are changed.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { campaignId, ...updates } = input;

        if (Object.keys(updates).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one campaign field to update.'
            });
        }

        // Field-setting PATCH is idempotent: repeating the same update leaves the campaign in the same state.
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/campaigns/update-campaign
            endpoint: `/api/campaigns/${encodeURIComponent(campaignId)}`,
            data: updates,
            retries: 3
        };

        const response = await nango.patch(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
