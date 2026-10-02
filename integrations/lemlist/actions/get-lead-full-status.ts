import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z.string().describe('Email address of the lead to look up. Example: "john.doe@domain.com"')
    })
    .describe('Lookup criteria for the lead whose consolidated cross-campaign status is requested');

const ActivitySchema = z
    .object({
        _id: z.string().describe('Unique activity identifier. Example: "act_PbKqTGpQqSlPcoOZ5"'),
        type: z
            .string()
            .describe(
                'Activity type (e.g. "emailsSent", "emailsOpened", "emailsClicked", "emailsReplied", "emailsBounced"). Email types are plural, LinkedIn invite types are "linkedinInvite*"'
            ),
        createdAt: z.string().describe('When the activity occurred (ISO 8601 datetime). Example: "2025-10-28T08:07:38.375Z"'),
        campaignId: z.string().optional().describe('Campaign the activity belongs to. Example: "cam_bSn8EORHQxbWPjHvu"'),
        leadId: z.string().optional().describe('Campaign-scoped lead ID the activity relates to. Example: "lea_fiDpiGV585wy3Oii2"'),
        sequenceStep: z.number().optional().describe('0-based position of the sequence step that produced the activity'),
        stepId: z
            .string()
            .optional()
            .describe('Stable identifier of the sequence step that produced the activity; absent on activities recorded before this field existed')
    })
    .passthrough();

const EnrollmentSchema = z.object({
    campaignId: z.string().describe('ID of the campaign the lead is enrolled in. Example: "cam_bSn8EORHQxbWPjHvu"'),
    campaignName: z.string().optional().describe('Name of the campaign the lead is enrolled in'),
    campaignStatus: z.string().optional().describe('Status of the campaign (e.g. "draft", "running", "paused")'),
    leadState: z.string().optional().describe('Current state of the lead in this campaign (e.g. "scanned", "contacted")'),
    leadStatus: z
        .string()
        .optional()
        .describe(
            'Current status of the lead in this campaign (e.g. "review", "scanning", "running", "paused", "done", "interested", "notInterested", "unsubscribed")'
        ),
    isPaused: z.boolean().optional().describe('Whether the lead is paused in this campaign'),
    variables: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom variables set on the lead for this campaign (e.g. firstName, lastName, companyName)'),
    activities: z
        .array(ActivitySchema)
        .describe(
            'Most recent engagement activities recorded for the lead in this campaign (sends, opens, clicks, replies, bounces, etc.); up to 50, empty when none have been recorded yet'
        )
});

const OutputSchema = z
    .object({
        email: z.string().describe('Email address that was looked up'),
        found: z
            .boolean()
            .describe(
                'Whether the lead currently has at least one campaign enrollment. false means the lead is unknown or has been removed from every campaign'
            ),
        enrollments: z.array(EnrollmentSchema).describe('One entry per campaign the lead is currently enrolled in; empty when found is false')
    })
    .describe("Consolidated 'where does this lead stand' view across every campaign the lead is enrolled in");

const ProviderLeadEntrySchema = z.object({
    _id: z.string(),
    isPaused: z.boolean().optional(),
    state: z.string().optional(),
    status: z.string().optional(),
    variables: z.record(z.string(), z.unknown()).optional(),
    campaign: z.object({
        id: z.string(),
        name: z.string().optional(),
        status: z.string().optional()
    })
});

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

function isNotFoundError(error: unknown): boolean {
    const parsed = HttpErrorSchema.safeParse(error);
    return parsed.success && parsed.data.response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Only reads the lead's campaign enrollments and per-campaign engagement activities; performs no provider mutations.
 * @pitfalls: A lead with no active enrollment in any campaign returns found:false with an empty enrollments list rather than throwing. An empty activities list means no engagement has been recorded for that enrollment yet, not a failed lookup, and activities is capped at the 50 most recent per enrollment with no way to page older ones. campaignStatus reflects the campaign status embedded on the lead's enrollment record and may not match the campaign's current lifecycle state.
 */
const action = createAction({
    description:
        "Get a consolidated 'where does this lead stand' view across every campaign it is enrolled in, combining lead state/status with per-campaign engagement activity (opens/clicks/replies/bounces) in one call",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let entries: z.infer<typeof ProviderLeadEntrySchema>[];
        // @allowTryCatch: the lead lookup 404s when the email has no active enrollment anywhere; this action reports that as found:false instead of an error
        try {
            // https://developer.lemlist.com/api-reference/endpoints/leads/get-lead-by-email
            const leadResponse = await nango.get({
                endpoint: `/api/leads/${encodeURIComponent(input.email)}`,
                params: {
                    version: 'v2'
                },
                retries: 3
            });
            entries = z.array(ProviderLeadEntrySchema).parse(leadResponse.data);
        } catch (error) {
            if (isNotFoundError(error)) {
                return { email: input.email, found: false, enrollments: [] };
            }
            throw error;
        }

        if (entries.length === 0) {
            return { email: input.email, found: false, enrollments: [] };
        }

        const enrollments: z.infer<typeof EnrollmentSchema>[] = [];
        for (const entry of entries) {
            // https://developer.lemlist.com/api-reference/endpoints/activities/get-many-activities
            const activitiesResponse = await nango.get({
                endpoint: '/api/activities',
                params: {
                    version: 'v2',
                    leadId: entry._id,
                    limit: 50
                },
                retries: 3
            });
            const activities = z.array(ActivitySchema).parse(activitiesResponse.data);
            enrollments.push({
                campaignId: entry.campaign.id,
                ...(entry.campaign.name !== undefined && { campaignName: entry.campaign.name }),
                ...(entry.campaign.status !== undefined && { campaignStatus: entry.campaign.status }),
                ...(entry.state !== undefined && { leadState: entry.state }),
                ...(entry.status !== undefined && { leadStatus: entry.status }),
                ...(entry.isPaused !== undefined && { isPaused: entry.isPaused }),
                ...(entry.variables !== undefined && { variables: entry.variables }),
                activities
            });
        }

        return { email: input.email, found: true, enrollments };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
