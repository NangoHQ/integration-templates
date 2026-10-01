import { z } from 'zod';
import { createAction } from 'nango';

const ActivityTypeSchema = z.enum([
    'emailsSent',
    'emailsOpened',
    'emailsClicked',
    'emailsReplied',
    'emailsExternalSent',
    'emailsExternalReceived',
    'emailsDone',
    'emailsIgnored',
    'emailsBounced',
    'emailsFailed',
    'emailsUnsubscribed',
    'emailsInterested',
    'emailsNotInterested',
    'snoozed',
    'annotated',
    'aircallDone',
    'aircallIgnored',
    'aircallCreated',
    'aircallEnded',
    'aircallInterested',
    'aircallNotInterested',
    'apiDone',
    'apiIgnored',
    'apiInterested',
    'apiNotInterested',
    'apiFailed',
    'apiUnsubscribed',
    'enrichmentDone',
    'enrichmentFailed',
    'enrichmentSkipped',
    'linkedinVisitDone',
    'linkedinVisitFailed',
    'linkedinVisitSkipped',
    'linkedinCommentLastPostDone',
    'linkedinCommentLastPostFailed',
    'linkedinCommentLastPostSkipped',
    'linkedinFollowDone',
    'linkedinFollowFailed',
    'linkedinFollowSkipped',
    'linkedinLikeLastPostDone',
    'linkedinLikeLastPostNoPost',
    'linkedinLikeLastPostFailed',
    'linkedinLikeLastPostSkipped',
    'linkedinInviteDone',
    'linkedinEndorseDone',
    'linkedinEndorseFailed',
    'linkedinEndorseSkipped',
    'linkedinSent',
    'linkedinInMailSent',
    'linkedinOpened',
    'linkedinInviteAccepted',
    'linkedinInviteFailed',
    'linkedinSendFailed',
    'linkedinInMailFailed',
    'linkedinInMailSkipped',
    'linkedinVoiceNoteDone',
    'linkedinVoiceNoteFailed',
    'linkedinWithdrawInvitationDone',
    'linkedinWithdrawInvitationFailed',
    'linkedinVoiceNoteReplied',
    'whatsappMessageSent',
    'whatsappMessageDelivered',
    'whatsappMessageOpened',
    'whatsappReplied',
    'whatsappMessageFailed',
    'whatsappDone',
    'whatsappIgnored',
    'whatsappVoiceNoteSent',
    'whatsappVoiceNoteDelivered',
    'whatsappVoiceNoteOpened',
    'whatsappVoiceNoteReplied',
    'whatsappVoiceNoteFailed',
    'whatsappVoiceNoteIgnored',
    'smsSent',
    'smsDone',
    'smsDelivered',
    'smsReplied',
    'smsIgnored',
    'smsFailed',
    'aiVariableDone',
    'aiVariableFailed',
    'linkedinReplied',
    'linkedinInterested',
    'linkedinNotInterested',
    'linkedinDone',
    'linkedinIgnored',
    'manualDone',
    'manualIgnored',
    'manualInterested',
    'manualNotInterested',
    'manualUnsubscribed',
    'scheduleCancelled',
    'paused',
    'stopped',
    'resumed',
    'skipped',
    'meetingBooked',
    'conditionChosen',
    'conditionalFailed',
    'sendToAnotherCampaign',
    'manualEmailQueued',
    'manualLinkedinSendQueued',
    'manualLinkedinVoiceNoteQueued',
    'manualLinkedinInviteQueued',
    'manualLinkedinCommentLastPostQueued',
    'manualWhatsappMessageQueued',
    'manualWhatsappVoiceNoteQueued',
    'outOfOffice',
    'mailinblackDetected',
    'entityUnsubscribed',
    'variableUnsubscribed',
    'entitySubscribed',
    'variableSubscribed'
]);

const InputSchema = z
    .object({
        campaignId: z
            .string()
            .optional()
            .describe('Filter activities to a single campaign. Omit to include activities from every campaign in the team. Example: "cam_123"'),
        leadId: z
            .string()
            .optional()
            .describe(
                'Filter activities to a single lead. This is the campaign-scoped lead ID (lea_...) as returned when the lead was added to a campaign, not the account-wide contactId. Example: "lea_123"'
            ),
        type: ActivityTypeSchema.optional().describe(
            'Filter by activity type. Exact spelling matters: email types are plural (emailsOpened), LinkedIn invite types are linkedinInvite*. The provider rejects unknown values with a 400.'
        ),
        limit: z.number().int().min(1).max(100).optional().describe('Number of activities to return per request, between 1 and 100. Defaults to 100.'),
        offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Number of activities to skip. To page through results, increment this by the limit on each request. Defaults to 0.'),
        minDate: z
            .string()
            .optional()
            .describe(
                'Return only activities with createdAt at or after this value. Accepts an ISO 8601 datetime (e.g. "2026-05-01T00:00:00Z") or a Unix timestamp in seconds (e.g. "1715385600").'
            ),
        maxDate: z
            .string()
            .optional()
            .describe(
                'Return only activities with createdAt at or before this value. Accepts an ISO 8601 datetime or a Unix timestamp in seconds. Must be strictly greater than minDate when both are set.'
            )
    })
    .describe('Filters for the lemlist activities feed. All fields are optional; with no filters the feed returns activities across all campaigns.');

const ActivitySchema = z.object({
    _id: z.string().describe('Unique activity identifier. Example: "act_PbKqTGpQqSlPcoOZ5"'),
    type: z
        .string()
        .describe(
            'Activity type, e.g. "emailsSent", "emailsOpened", "emailsClicked", "emailsReplied" or "emailsBounced". Matches the lemlist ActivityType enum used by the type filter.'
        ),
    createdAt: z.string().describe('ISO 8601 timestamp of when the activity occurred. Example: "2025-10-28T08:07:38.375Z"'),
    campaignId: z
        .string()
        .optional()
        .describe('ID of the campaign the activity belongs to. Absent on activities that are not tied to a campaign. Example: "cam_bSn8EORHQxbWPjHvu"'),
    campaignName: z.string().optional().describe('Name of the campaign the activity belongs to, when the activity is tied to a campaign.'),
    leadId: z
        .string()
        .optional()
        .describe('Campaign-scoped ID of the lead the activity relates to. Absent when the activity is not tied to a lead. Example: "lea_fiDpiGV585wy3Oii2"'),
    contactId: z.string().optional().describe('Account-wide contact ID the activity relates to. Example: "ctc_xW8Ou6C03Csv8vatp"'),
    leadEmail: z.string().optional().describe('Lead email address as it was when the activity happened. Present on campaign activities only.'),
    leadFirstName: z
        .string()
        .optional()
        .describe('Lead first name as it was when the activity happened. Campaign activities only, and only if the lead had this variable set at that moment.'),
    leadLastName: z.string().optional().describe('Lead last name as it was when the activity happened. Same scope as leadFirstName.'),
    leadCompanyName: z.string().optional().describe('Lead company name as it was when the activity happened. Same scope as leadFirstName.'),
    sequenceId: z.string().optional().describe('ID of the sequence that produced the activity. Example: "seq_ODjsLXkxXiySRw6dK"'),
    stepId: z
        .string()
        .optional()
        .describe('Stable identifier of the sequence step that produced the activity. Absent on older activities recorded before step-level tracking existed.'),
    sequenceStep: z
        .number()
        .optional()
        .describe(
            'Zero-based position of the step within the sequence at the time of the activity. Shifts when sequence steps are reordered; prefer stepId for a stable reference.'
        ),
    totalSequenceStep: z.number().optional().describe('Zero-based count of the sequence steps already delivered to this lead when the activity occurred.')
});

const OutputSchema = z
    .object({
        activities: z.array(ActivitySchema).describe('Activity events matching the requested filters.'),
        nextOffset: z
            .number()
            .int()
            .optional()
            .describe(
                'Offset to pass as offset to fetch the next page. Present only when this page is full (its size equals the requested limit), meaning more activities may exist. A follow-up request can still return an empty page when the total is an exact multiple of the limit.'
            )
    })
    .describe('The matching activity events plus the offset to fetch the next page when more results may exist.');

/**
 * @tags: [read]
 * @tagReason: Only reads activity events from the lemlist API; it never mutates provider state.
 * @pitfalls: leadId is the campaign-scoped lead ID (lea_...), not the account-wide contactId or an email address. Lead email, name, and company fields on each activity are snapshots from when the activity happened, so they can differ from the lead's current values and are absent if the lead lacked them at that moment. sequenceStep is zero-based and shifts when sequence steps are reordered, so use stepId for a stable step reference; stepId is absent on older activities.
 */
const action = createAction({
    description: 'List granular activity events (opens, clicks, replies, bounces, sends, etc.) for a campaign and/or a specific lead.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const offset = input.offset ?? 0;

        // https://developer.lemlist.com/api-reference/endpoints/activities/get-many-activities
        const response = await nango.get({
            endpoint: '/api/activities',
            params: {
                version: 'v2',
                limit,
                offset,
                ...(input.campaignId !== undefined && { campaignId: input.campaignId }),
                ...(input.leadId !== undefined && { leadId: input.leadId }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.minDate !== undefined && { minDate: input.minDate }),
                ...(input.maxDate !== undefined && { maxDate: input.maxDate })
            },
            retries: 3
        });

        const activities = z.array(ActivitySchema).parse(response.data);

        return {
            activities,
            ...(activities.length === limit && { nextOffset: offset + activities.length })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
