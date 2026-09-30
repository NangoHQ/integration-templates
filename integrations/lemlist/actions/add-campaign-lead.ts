import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.string().describe('ID of the campaign to add the lead to. Example: "cam_A1B2C3D4E5F6G7H8I9".'),
        email: z
            .string()
            .describe(
                'Email address of the lead to add. It is sent URL-encoded in the request path, not in the request body. Example: "jane.doe@example.com".'
            ),
        firstName: z.string().optional().describe('First name of the lead.'),
        lastName: z.string().optional().describe('Last name of the lead.'),
        companyName: z.string().optional().describe('Company name of the lead. Written to the shared company record linked to the lead.'),
        jobTitle: z.string().optional().describe('Job title of the lead.'),
        linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the lead. Example: "https://www.linkedin.com/in/janedoe".'),
        picture: z.string().optional().describe('Profile picture URL of the lead.'),
        phone: z.string().optional().describe('Phone number of the lead.'),
        companyDomain: z
            .string()
            .optional()
            .describe('Company domain of the lead. Example: "example.com". Written to the shared company record linked to the lead.'),
        icebreaker: z.string().optional().describe('Personalized icebreaker message for the lead.'),
        timezone: z.string().optional().describe('Timezone of the lead in IANA format. Example: "Europe/Paris".'),
        contactOwner: z.string().optional().describe('Contact owner, as a lemlist user ID or user login email. Example: "owner@example.com".'),
        customVariables: z
            .record(z.string(), z.string())
            .optional()
            .describe(
                'Additional key/value pairs stored as custom variables on the lead, usable in campaigns as {{variableName}}. Example: { "companySize": "50-100" }.'
            )
    })
    .describe('Input for adding a lead to a lemlist campaign.');

const ProviderWarningSchema = z.object({
    code: z.string(),
    message: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional()
});

const ProviderLeadSchema = z.object({
    _id: z.string(),
    campaignId: z.string(),
    campaignName: z.string().optional(),
    email: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    jobTitle: z.string().optional(),
    companyDomain: z.string().optional(),
    linkedinUrl: z.string().optional(),
    picture: z.string().optional(),
    phone: z.string().optional(),
    icebreaker: z.string().optional(),
    timezone: z.string().optional(),
    contactOwner: z.string().optional(),
    isPaused: z.boolean(),
    contactId: z.string().optional(),
    warnings: z.array(ProviderWarningSchema).optional()
});

const WarningOutputSchema = z.object({
    code: z.string().describe('Machine-readable warning code, e.g. "FIELDS_KEPT" or "invalid-company-domain".'),
    message: z.string().optional().describe('Human-readable warning message.'),
    params: z.record(z.string(), z.unknown()).optional().describe('Additional warning details, e.g. the list of fields that were kept unchanged.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the lead. Example: "lea_fiDpiGV585wy3Oii2".'),
        campaignId: z.string().describe('ID of the campaign the lead was added to.'),
        campaignName: z.string().optional().describe('Name of the campaign the lead was added to.'),
        email: z.string().describe('Email address of the lead.'),
        firstName: z.string().optional().describe('First name of the lead.'),
        lastName: z.string().optional().describe('Last name of the lead.'),
        companyName: z.string().optional().describe('Company name of the lead.'),
        jobTitle: z.string().optional().describe('Job title of the lead.'),
        companyDomain: z.string().optional().describe('Company domain of the lead.'),
        linkedinUrl: z.string().optional().describe('LinkedIn profile URL of the lead.'),
        picture: z.string().optional().describe('Profile picture URL of the lead.'),
        phone: z.string().optional().describe('Phone number of the lead.'),
        icebreaker: z.string().optional().describe('Personalized icebreaker message for the lead.'),
        timezone: z.string().optional().describe('Timezone of the lead in IANA format.'),
        contactOwner: z.string().optional().describe('Contact owner of the lead.'),
        isPaused: z.boolean().describe('Whether the lead is paused in the campaign.'),
        contactId: z.string().optional().describe('ID of the contact record associated with the lead. Example: "ctc_xW8Ou6C03Csv8vatp".'),
        warnings: z
            .array(WarningOutputSchema)
            .optional()
            .describe('Non-blocking notices returned by lemlist, e.g. why the company part was skipped or which values were kept unchanged.')
    })
    .describe('The lead as stored in the campaign after it was added.');

/**
 * @tags: [write]
 * @tagReason: Creates a lead in a campaign via POST; it reads nothing and has no destructive effect.
 * @pitfalls: Fails with a 400 error when the email is already a lead in the campaign; it does not update the existing lead. Company fields write to the shared company record seen by every linked lead, and an explicitly empty string clears that stored value rather than leaving it unchanged.
 */
const action = createAction({
    description: 'Add a lead (by email) to a campaign with optional profile fields and custom variables.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/leads/create-lead-in-campaign
            endpoint: `/api/campaigns/${encodeURIComponent(input.campaignId)}/leads/${encodeURIComponent(input.email)}`,
            data: {
                ...(input.customVariables ?? {}),
                ...(input.firstName !== undefined && { firstName: input.firstName }),
                ...(input.lastName !== undefined && { lastName: input.lastName }),
                ...(input.companyName !== undefined && { companyName: input.companyName }),
                ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
                ...(input.linkedinUrl !== undefined && { linkedinUrl: input.linkedinUrl }),
                ...(input.picture !== undefined && { picture: input.picture }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.companyDomain !== undefined && { companyDomain: input.companyDomain }),
                ...(input.icebreaker !== undefined && { icebreaker: input.icebreaker }),
                ...(input.timezone !== undefined && { timezone: input.timezone }),
                ...(input.contactOwner !== undefined && { contactOwner: input.contactOwner })
            },
            // No idempotency key: a retry after a lost response would repeat the create and 400 once the lead already exists, so disable automatic retries.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);
        const lead = ProviderLeadSchema.parse(response.data);

        return {
            id: lead._id,
            campaignId: lead.campaignId,
            ...(lead.campaignName !== undefined && { campaignName: lead.campaignName }),
            email: lead.email,
            ...(lead.firstName !== undefined && { firstName: lead.firstName }),
            ...(lead.lastName !== undefined && { lastName: lead.lastName }),
            ...(lead.companyName !== undefined && { companyName: lead.companyName }),
            ...(lead.jobTitle !== undefined && { jobTitle: lead.jobTitle }),
            ...(lead.companyDomain !== undefined && { companyDomain: lead.companyDomain }),
            ...(lead.linkedinUrl !== undefined && { linkedinUrl: lead.linkedinUrl }),
            ...(lead.picture !== undefined && { picture: lead.picture }),
            ...(lead.phone !== undefined && { phone: lead.phone }),
            ...(lead.icebreaker !== undefined && { icebreaker: lead.icebreaker }),
            ...(lead.timezone !== undefined && { timezone: lead.timezone }),
            ...(lead.contactOwner !== undefined && { contactOwner: lead.contactOwner }),
            isPaused: lead.isPaused,
            ...(lead.contactId !== undefined && { contactId: lead.contactId }),
            ...(lead.warnings !== undefined && { warnings: lead.warnings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
