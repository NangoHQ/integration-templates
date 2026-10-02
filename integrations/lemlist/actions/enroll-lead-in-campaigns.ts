import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z.string().describe('Email address of the lead to enroll. Example: "john.doe@example.com"'),
        campaignIds: z
            .array(z.string().describe('lemlist campaign ID. Example: "cam_vyzp8v33RBTfNQRvz"'))
            .min(1)
            .describe('Campaign IDs to enroll the lead into. Each ID gets its own enrollment attempt and its own entry in the results array'),
        firstName: z.string().optional().describe('First name of the lead, sent to every campaign'),
        lastName: z.string().optional().describe('Last name of the lead, sent to every campaign'),
        companyName: z.string().optional().describe('Company name of the lead, sent to every campaign'),
        customVariables: z
            .record(z.string(), z.string())
            .optional()
            .describe(
                'Custom variables stored on the lead in every campaign, usable in campaign messages as {{variableName}}. Example: {"companySize": "50-100"}'
            )
    })
    .describe(
        'Everything needed to enroll one lead into multiple lemlist campaigns at once: the lead email, the target campaign IDs, and optional lead fields applied to every campaign'
    );

const EnrolledLeadSchema = z.object({
    _id: z.string().optional().describe('lemlist lead ID, scoped to this campaign. Example: "lea_fiDpiGV585wy3Oii2"'),
    campaignId: z.string().optional().describe('ID of the campaign the lead was enrolled in'),
    campaignName: z.string().optional().describe('Name of the campaign the lead was enrolled in'),
    contactId: z.string().optional().describe('Account-wide contact ID, shared by every enrollment of this email address. Example: "ctc_xW8Ou6C03Csv8vatp"'),
    email: z.string().optional().describe('Email address of the enrolled lead'),
    firstName: z.string().optional().describe('First name stored on the lead'),
    lastName: z.string().optional().describe('Last name stored on the lead'),
    companyName: z.string().optional().describe('Company name stored on the lead'),
    isPaused: z.boolean().optional().describe('Whether the lead is paused in this campaign')
});

const EnrollmentResultSchema = z.object({
    campaignId: z.string().describe('Campaign ID this result entry refers to'),
    success: z.boolean().describe('True when the lead was enrolled in this campaign, false when the enrollment failed'),
    lead: EnrolledLeadSchema.optional().describe('Lead record returned by lemlist; present only when success is true'),
    error: z.string().optional().describe('Reason the enrollment failed; present only when success is false')
});

const OutputSchema = z
    .object({
        email: z.string().describe('Email address of the lead that was enrolled'),
        results: z
            .array(EnrollmentResultSchema)
            .describe('One entry per requested campaign ID, in request order, each with its own success flag and lead record or error')
    })
    .describe('Consolidated outcome of the multi-campaign enrollment: the lead email plus a per-campaign success/failure result for every requested campaign');

const ProviderLeadSchema = z.object({
    _id: z.string().nullable().optional(),
    campaignId: z.string().nullable().optional(),
    campaignName: z.string().nullable().optional(),
    contactId: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    isPaused: z.boolean().nullable().optional()
});

const ProviderErrorSchema = z.object({
    message: z.string().optional(),
    response: z
        .object({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const ProviderErrorDataSchema = z.object({
    error: z.string().optional(),
    message: z.string().optional()
});

function describeEnrollmentError(err: unknown): string {
    const parsed = ProviderErrorSchema.safeParse(err);
    if (!parsed.success) {
        return 'Unknown error while enrolling the lead';
    }
    const status = parsed.data.response?.status;
    const data = parsed.data.response?.data;
    let detail: string | undefined;
    if (typeof data === 'string' && data.trim().length > 0) {
        detail = data;
    } else {
        const parsedData = ProviderErrorDataSchema.safeParse(data);
        if (parsedData.success) {
            detail = parsedData.data.error ?? parsedData.data.message;
        }
    }
    if (detail !== undefined) {
        return status !== undefined ? `Request failed with status ${status}: ${detail}` : detail;
    }
    return parsed.data.message ?? 'Unknown error while enrolling the lead';
}

/**
 * @tags: [write]
 * @tagReason: Only sends POST requests that create lead enrollments in campaigns; performs no provider reads and no deletes or other difficult-to-reverse effects.
 * @pitfalls: Failures are reported per campaign instead of failing the whole call, so always inspect every result entry's success flag. Unknown or inactive campaign IDs and emails on the account-wide unsubscribe list surface as failed entries rather than errors. Re-invoking the action for a lead already enrolled in a campaign fails that campaign's entry ("lead already in campaign"), so the call is not idempotent per campaign. Sent fields also overwrite the shared contact/company record the lead matches, so the values propagate to other campaigns and leads linked to that record.
 */
const action = createAction({
    description:
        'Enroll one lead (by email, with optional basic fields and custom variables) into a list of lemlist campaigns in a single call, returning a consolidated per-campaign success/failure result',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const leadFields: Record<string, string> = {
            ...(input.customVariables ?? {}),
            ...(input.firstName !== undefined && { firstName: input.firstName }),
            ...(input.lastName !== undefined && { lastName: input.lastName }),
            ...(input.companyName !== undefined && { companyName: input.companyName })
        };

        const results: z.infer<typeof EnrollmentResultSchema>[] = [];

        for (const campaignId of input.campaignIds) {
            // @allowTryCatch: per-campaign failure isolation is the contract of this composite action - one failing campaign ID must not abort enrollment into the remaining campaigns.
            try {
                // https://developer.lemlist.com/api-reference/endpoints/leads/create-lead-in-campaign
                const response = await nango.post({
                    endpoint: `/api/campaigns/${encodeURIComponent(campaignId)}/leads/${encodeURIComponent(input.email)}`,
                    data: leadFields,
                    // No retries on purpose: this create-style POST has no idempotency key, and replaying it after a lost response is refused as a duplicate ("Lead already in the campaign") and would be misreported here as a failure.
                    // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                    retries: 0
                });

                const parsed = ProviderLeadSchema.safeParse(response.data);
                // lemlist answers a POST to an unknown or inactive campaign with HTTP 200 and an empty body,
                // so success requires a parsed lead object carrying the requested email.
                if (
                    !parsed.success ||
                    parsed.data.email === undefined ||
                    parsed.data.email === null ||
                    parsed.data.email.toLowerCase() !== input.email.toLowerCase()
                ) {
                    results.push({ campaignId, success: false, error: 'Campaign not found or inactive' });
                    continue;
                }

                const lead = parsed.data;
                results.push({
                    campaignId,
                    success: true,
                    lead: {
                        ...(lead._id != null && { _id: lead._id }),
                        ...(lead.campaignId != null && { campaignId: lead.campaignId }),
                        ...(lead.campaignName != null && { campaignName: lead.campaignName }),
                        ...(lead.contactId != null && { contactId: lead.contactId }),
                        ...(lead.email != null && { email: lead.email }),
                        ...(lead.firstName != null && { firstName: lead.firstName }),
                        ...(lead.lastName != null && { lastName: lead.lastName }),
                        ...(lead.companyName != null && { companyName: lead.companyName }),
                        ...(lead.isPaused != null && { isPaused: lead.isPaused })
                    }
                });
            } catch (err) {
                results.push({ campaignId, success: false, error: describeEnrollmentError(err) });
            }
        }

        return { email: input.email, results };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
