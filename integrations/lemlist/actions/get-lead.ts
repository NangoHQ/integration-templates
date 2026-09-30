import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z
            .string()
            .describe('Email address of the lead to retrieve. The lookup is account-wide, so no campaign ID is required. Example: "john.doe@example.com"')
    })
    .describe('Parameters for retrieving a single lemlist lead by email address.');

const LeadResponseSchema = z.object({
    _id: z.string(),
    email: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    jobTitle: z.string().optional(),
    companyDomain: z.string().optional(),
    campaignId: z.string().optional(),
    contactId: z.string().optional(),
    emailStatus: z.string().optional(),
    isPaused: z.boolean().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique lemlist identifier of the lead. Example: "lea_fiDpiGV585wy3Oii2"'),
        email: z.string().describe('Email address of the lead. Example: "john.doe@example.com"'),
        firstName: z.string().optional().describe('First name of the lead. Omitted when not set.'),
        lastName: z.string().optional().describe('Last name of the lead. Omitted when not set.'),
        companyName: z.string().optional().describe('Company name of the lead. Omitted when not set.'),
        jobTitle: z.string().optional().describe('Job title of the lead. Omitted when not set.'),
        companyDomain: z.string().optional().describe('Company domain of the lead. Omitted when not set.'),
        campaignId: z.string().optional().describe('ID of the campaign the lead belongs to. Example: "cam_bSn8EORHQxbWPjHvu"'),
        contactId: z.string().optional().describe('ID of the lemlist contact associated with the lead. Example: "ctc_xW8Ou6C03Csv8vatp"'),
        emailStatus: z.string().optional().describe('Email verification status of the lead, present once enrichment has run. Example: "deliverable"'),
        isPaused: z.boolean().optional().describe('Whether the lead is paused in its campaign.')
    })
    .describe('A single lemlist lead with its profile fields, identifiers, and campaign association.');

/**
 * @tags: [read]
 * @tagReason: Fetches a single lead by email without creating, changing, or removing any provider data.
 * @pitfalls: Leads removed from their campaign still return successfully with their last-known data, including the campaign they were removed from; a 404 occurs only for emails that never existed on the account.
 */
const action = createAction({
    description: 'Retrieve a single lead by email, account-wide (not campaign-scoped).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.lemlist.com/api-reference/endpoints/leads/get-lead-by-email
        const response = await nango.get({
            endpoint: `/api/leads/${encodeURIComponent(input.email)}`,
            retries: 3
        });

        const lead = LeadResponseSchema.parse(response.data);

        return {
            id: lead._id,
            email: lead.email,
            firstName: lead.firstName,
            lastName: lead.lastName,
            companyName: lead.companyName,
            jobTitle: lead.jobTitle,
            companyDomain: lead.companyDomain,
            campaignId: lead.campaignId,
            contactId: lead.contactId,
            emailStatus: lead.emailStatus,
            isPaused: lead.isPaused
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
