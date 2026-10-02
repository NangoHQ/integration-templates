import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z.string().describe('Email address of the lead to remove from every campaign and suppress account-wide. Example: "jane.doe@example.com"')
    })
    .describe(
        "Compliance request: remove a lead from all of its current campaign enrollments and unsubscribe it account-wide, e.g. a 'this person asked to be fully removed' request."
    );

const RemovedCampaignSchema = z.object({
    campaignId: z.string().describe('ID of a campaign the lead was enrolled in when this action ran. Example: "cam_bSn8EORHQxbWPjHvu"'),
    campaignName: z.string().optional().describe('Name of that campaign, as reported by the enrollment lookup. Example: "Q4 Outreach"'),
    outcome: z
        .enum(['unsubscribed', 'already_suppressed'])
        .describe(
            "'unsubscribed' when this call performed the removal; 'already_suppressed' when lemlist reported the email as already unsubscribed (expected once the first removal succeeds, since the suppression is account-wide). Both mean the lead is fully removed."
        )
});

const OutputSchema = z
    .object({
        email: z.string().describe('Email address that was processed. Example: "jane.doe@example.com"'),
        removedFromCampaigns: z
            .array(RemovedCampaignSchema)
            .describe(
                'One entry per campaign enrollment discovered for the lead, with the outcome of its removal. Empty when the lead had no active enrollments.'
            ),
        suppressedAccountWide: z
            .boolean()
            .describe(
                'True when the email is now on the account-wide unsubscribe list (any processed removal suppresses it account-wide), which also blocks re-adding it to any campaign.'
            ),
        message: z.string().describe('Human-readable summary of the outcome.')
    })
    .describe('Result of removing the lead from every campaign it was enrolled in and suppressing it account-wide.');

const LeadEnrollmentSchema = z.object({
    _id: z.string(),
    campaign: z.object({
        id: z.string(),
        name: z.string().optional()
    })
});

const LeadEnrollmentsSchema = z.array(LeadEnrollmentSchema);

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

function httpErrorStatus(err: unknown): number | undefined {
    const parsed = HttpErrorSchema.safeParse(err);
    return parsed.success ? parsed.data.response.status : undefined;
}

function nothingToRemove(email: string): z.infer<typeof OutputSchema> {
    return {
        email,
        removedFromCampaigns: [],
        suppressedAccountWide: false,
        message: 'Lead has no active enrollments - nothing to remove.'
    };
}

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the lead's current campaign enrollments, then deletes it from each campaign; the delete form used also unsubscribes the email account-wide, a difficult-to-reverse suppression.
 * @pitfalls: The removal is an account-wide unsubscribe, not just a per-campaign removal: the email cannot be re-added to any campaign afterwards until it is explicitly resubscribed, and the lead record itself stays in each campaign in an unsubscribed state rather than being deleted.
 */
const action = createAction({
    description: 'Remove a lead from every campaign it is currently enrolled in and unsubscribe it account-wide, for full-removal compliance requests.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let discoveryData: unknown;
        // @allowTryCatch: lemlist answers this lookup with a 404 when the lead has no active enrollments; for this action that is a benign nothing-to-remove result, not an error.
        try {
            // https://developer.lemlist.com/api-reference/endpoints/leads/get-lead-by-email
            const response = await nango.get({
                endpoint: `/api/leads/${encodeURIComponent(input.email)}`,
                params: {
                    version: 'v2'
                },
                retries: 3
            });
            // Recorded 404 mocks resolve instead of throwing, so check the status too.
            if (response.status === 404) {
                return nothingToRemove(input.email);
            }
            discoveryData = response.data;
        } catch (err) {
            if (httpErrorStatus(err) === 404) {
                return nothingToRemove(input.email);
            }
            throw err;
        }

        const enrollments = LeadEnrollmentsSchema.parse(discoveryData);

        const seen = new Set<string>();
        const campaigns: { id: string; name?: string }[] = [];
        for (const enrollment of enrollments) {
            if (seen.has(enrollment.campaign.id)) {
                continue;
            }
            seen.add(enrollment.campaign.id);
            campaigns.push({
                id: enrollment.campaign.id,
                ...(enrollment.campaign.name !== undefined && { name: enrollment.campaign.name })
            });
        }

        if (campaigns.length === 0) {
            return nothingToRemove(input.email);
        }

        const removedFromCampaigns: z.infer<typeof RemovedCampaignSchema>[] = [];
        for (const campaign of campaigns) {
            let outcome: z.infer<typeof RemovedCampaignSchema>['outcome'];
            // @allowTryCatch: the first successful delete suppresses the email account-wide, so lemlist answers the remaining per-campaign deletes with a 404 'already unsubscribed'; that is the desired end state, not a failure. Any other error aborts the action.
            try {
                // https://developer.lemlist.com/api-reference/endpoints/leads/delete-lead
                const response = await nango.delete({
                    endpoint: `/api/campaigns/${encodeURIComponent(campaign.id)}/leads/${encodeURIComponent(input.email)}`,
                    // Idempotent in effect: without action=remove this unsubscribes the email account-wide, and a repeated call is a benign already-unsubscribed 404 handled below, so bounded retries are safe.
                    retries: 3
                });
                // Recorded 404 mocks resolve instead of throwing, so check the status too.
                outcome = response.status === 404 ? 'already_suppressed' : 'unsubscribed';
            } catch (err) {
                if (httpErrorStatus(err) !== 404) {
                    throw err;
                }
                outcome = 'already_suppressed';
            }
            removedFromCampaigns.push({
                campaignId: campaign.id,
                ...(campaign.name !== undefined && { campaignName: campaign.name }),
                outcome
            });
        }

        return {
            email: input.email,
            removedFromCampaigns,
            suppressedAccountWide: true,
            message: `Removed ${input.email} from ${removedFromCampaigns.length} campaign(s) and added it to the account-wide unsubscribe list.`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
