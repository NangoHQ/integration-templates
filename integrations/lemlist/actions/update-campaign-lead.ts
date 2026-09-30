import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.string().describe('ID of the campaign the lead belongs to. Example: "cam_A1B2C3D4E5F6G7H8I9"'),
        email: z.string().describe('Email address of the lead to update. Example: "john.doe@example.com"'),
        firstName: z.string().optional().describe('New first name of the lead.'),
        lastName: z.string().optional().describe('New last name of the lead.'),
        companyName: z
            .string()
            .optional()
            .describe('New company name. Written to the company record the lead is linked to, which is shared by every lead linked to that company.'),
        jobTitle: z.string().optional().describe('New job title of the lead.'),
        preferredContactMethod: z.string().optional().describe('Preferred contact method of the lead. Known values: "email", "linkedIn".'),
        updateStrategy: z
            .enum(['overwrite', 'overwriteIgnoreEmpty', 'fillEmptyOnly'])
            .optional()
            .describe(
                'How sent values are applied to the lead, its contact and its company. "overwrite" (default) replaces stored values and an empty string clears a field; "overwriteIgnoreEmpty" ignores empty values; "fillEmptyOnly" only fills fields that are currently empty.'
            )
    })
    .describe('Input for updating a lead in a lemlist campaign.');

const ProviderWarningSchema = z.object({
    code: z.string(),
    message: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional()
});

const ProviderLeadSchema = z.object({
    _id: z.string(),
    campaignId: z.string(),
    campaignName: z.string(),
    leadUrl: z.string(),
    email: z.string(),
    isPaused: z.boolean(),
    contactId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    jobTitle: z.string().optional(),
    companyDomain: z.string().optional(),
    preferredContactMethod: z.string().optional(),
    emailStatus: z.string().optional(),
    warnings: z.array(ProviderWarningSchema).optional()
});

const WarningOutputSchema = z.object({
    code: z.string().describe('Machine-readable warning code. Example: "FIELDS_KEPT"'),
    message: z.string().optional().describe('Human-readable warning message.'),
    params: z.record(z.string(), z.unknown()).optional().describe('Warning details, e.g. the names of the fields the update strategy kept.')
});

const OutputSchema = z
    .object({
        _id: z.string().describe('Unique identifier of the lead. Example: "lea_8xJSc7sV7ggpiVnXe"'),
        campaignId: z.string().describe('ID of the campaign the lead belongs to.'),
        campaignName: z.string().describe('Name of the campaign the lead belongs to.'),
        leadUrl: z.string().describe('API URL of the lead. Example: "https://api.lemlist.com/api/leads/john%40example.com"'),
        email: z.string().describe('Email address of the lead.'),
        isPaused: z.boolean().describe('Whether the lead is paused in the campaign.'),
        contactId: z.string().optional().describe('ID of the contact the lead is linked to. Example: "ctc_A1B2C3D4E5F6G7H8I9"'),
        firstName: z.string().optional().describe('First name of the lead.'),
        lastName: z.string().optional().describe('Last name of the lead.'),
        companyName: z.string().optional().describe('Name of the company the lead is linked to.'),
        jobTitle: z.string().optional().describe('Job title of the lead.'),
        companyDomain: z.string().optional().describe('Domain of the company the lead is linked to.'),
        preferredContactMethod: z.string().optional().describe('Preferred contact method of the lead.'),
        emailStatus: z.string().optional().describe('Email verification status of the lead. Example: "deliverable"'),
        warnings: z
            .array(WarningOutputSchema)
            .optional()
            .describe('Non-blocking provider notices, e.g. company record writes or fields kept by the update strategy.')
    })
    .describe('The updated campaign lead.');

/**
 * @tags: [write]
 * @tagReason: Mutates a lead in a lemlist campaign through a partial-merge PATCH; performs no provider reads or deletions.
 * @pitfalls: Updates write through to the shared contact and company records, so changing fields like firstName or companyName affects every lead linked to them; companyName alone renames the lead's company or links it to one with that name, creating it if needed. Under the default overwrite update strategy, sending an empty string clears that field.
 */
const action = createAction({
    description: "Update a lead's fields within a campaign (partial merge).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.lemlist.com/api-reference/endpoints/leads/update-lead
            endpoint: `/api/campaigns/${encodeURIComponent(input.campaignId)}/leads/${encodeURIComponent(input.email)}`,
            params: {
                ...(input.updateStrategy !== undefined && { updateStrategy: input.updateStrategy })
            },
            data: {
                ...(input.firstName !== undefined && { firstName: input.firstName }),
                ...(input.lastName !== undefined && { lastName: input.lastName }),
                ...(input.companyName !== undefined && { companyName: input.companyName }),
                ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
                ...(input.preferredContactMethod !== undefined && { preferredContactMethod: input.preferredContactMethod })
            },
            // Idempotent partial merge: retrying re-applies the same field values, so the lead converges to the same state.
            retries: 3
        };

        const response = await nango.patch(config);
        const lead = ProviderLeadSchema.parse(response.data);

        return {
            _id: lead._id,
            campaignId: lead.campaignId,
            campaignName: lead.campaignName,
            leadUrl: lead.leadUrl,
            email: lead.email,
            isPaused: lead.isPaused,
            ...(lead.contactId !== undefined && { contactId: lead.contactId }),
            ...(lead.firstName !== undefined && { firstName: lead.firstName }),
            ...(lead.lastName !== undefined && { lastName: lead.lastName }),
            ...(lead.companyName !== undefined && { companyName: lead.companyName }),
            ...(lead.jobTitle !== undefined && { jobTitle: lead.jobTitle }),
            ...(lead.companyDomain !== undefined && { companyDomain: lead.companyDomain }),
            ...(lead.preferredContactMethod !== undefined && { preferredContactMethod: lead.preferredContactMethod }),
            ...(lead.emailStatus !== undefined && { emailStatus: lead.emailStatus }),
            ...(lead.warnings !== undefined && { warnings: lead.warnings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
