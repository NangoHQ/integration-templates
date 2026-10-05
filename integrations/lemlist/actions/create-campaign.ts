import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Name of the campaign to create. Example: "Q1 outbound - founders"'),
        timezone: z
            .string()
            .optional()
            .describe('IANA timezone for the auto-generated campaign schedule. Defaults to "Europe/Paris" when omitted. Example: "America/New_York"'),
        autoReview: z
            .boolean()
            .optional()
            .describe('When true, leads added to the campaign are launched automatically instead of requiring manual review. Defaults to false.'),
        autoReviewConditions: z
            .array(z.enum(['deliverable', 'risky', 'undeliverable', 'unverified']))
            .optional()
            .describe(
                'Email verification statuses for which a lead is auto-launched when autoReview is enabled. Allowed values: "deliverable", "risky", "undeliverable", "unverified".'
            )
    })
    .describe('Input for creating a new lemlist campaign. An empty sequence and default schedule are auto-generated; add leads and configure steps afterward.');

const ProviderCampaignSchema = z.object({
    _id: z.string(),
    name: z.string(),
    state: z.string(),
    sequenceId: z.string(),
    scheduleIds: z.array(z.string()),
    teamId: z.string(),
    createdBy: z.string().optional(),
    createdAt: z.string(),
    emoji: z.string().optional()
});

const OutputSchema = z
    .object({
        _id: z.string().describe('Unique identifier of the created campaign. Example: "cam_kok3I33Sba7mcNIO7"'),
        name: z.string().describe('Name of the created campaign.'),
        state: z
            .string()
            .describe(
                'Lifecycle state of the campaign right after creation (e.g. "running"). This value is authoritative for whether the creation took effect.'
            ),
        sequenceId: z.string().describe('ID of the auto-generated empty sequence. Use it to add sequence steps. Example: "seq_ScVmFnlKdP6aVmyZN"'),
        scheduleIds: z.array(z.string()).describe('IDs of the auto-generated default schedules attached to the campaign. Example: ["skd_IrCdCoQ0ZUAEeUDwR"]'),
        teamId: z.string().describe('ID of the team that owns the campaign. Example: "tea_edrkv2LgUK4Wf4ZzO"'),
        createdBy: z.string().optional().describe('ID of the user who created the campaign. Example: "usr_Sy3xIhbEi7auHFv5A"'),
        createdAt: z.string().describe('ISO 8601 creation timestamp of the campaign. Example: "2025-01-16T13:53:22.726Z"'),
        emoji: z.string().optional().describe('Emoji assigned to the campaign for display in the lemlist app. Example: "🚀"')
    })
    .describe('The newly created lemlist campaign, including its auto-generated sequence and schedule IDs.');

/**
 * @tags: [write]
 * @tagReason: Creates a new campaign in the lemlist account; makes no reads and deletes nothing.
 * @pitfalls: A created campaign cannot be deleted via the lemlist API; pausing is the only way to turn it off. The returned state is authoritative for whether creation took effect and can differ from the status later shown by campaign listing, e.g. a new campaign can report running here while listing shows draft.
 */
const action = createAction({
    description: 'Create a new, empty campaign (sequence and schedule are auto-generated; add leads and configure steps afterward).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/campaigns/create-campaign
            endpoint: '/api/campaigns',
            data: {
                name: input.name,
                ...(input.timezone !== undefined && { timezone: input.timezone }),
                ...(input.autoReview !== undefined && { autoReview: input.autoReview }),
                ...(input.autoReviewConditions !== undefined && { autoReviewConditions: input.autoReviewConditions })
            },
            // retries: 0 — creating a campaign is not idempotent (no idempotency key), so retrying after a lost response would create a duplicate campaign.
            retries: 10
        };

        const response = await nango.post(config);

        const campaign = ProviderCampaignSchema.parse(response.data);

        return {
            _id: campaign._id,
            name: campaign.name,
            state: campaign.state,
            sequenceId: campaign.sequenceId,
            scheduleIds: campaign.scheduleIds,
            teamId: campaign.teamId,
            createdAt: campaign.createdAt,
            ...(campaign.createdBy !== undefined && { createdBy: campaign.createdBy }),
            ...(campaign.emoji !== undefined && { emoji: campaign.emoji })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
