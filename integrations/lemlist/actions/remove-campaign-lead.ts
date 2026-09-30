import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        campaignId: z.string().describe('The unique identifier of the campaign to remove the lead from. Example: "cam_A1B2C3D4E5F6G7H8I9"'),
        email: z.string().describe('The email address of the lead to remove from the campaign. Example: "alex.doe@example.com"')
    })
    .describe('Input for removing a lead from a lemlist campaign');

const OutputSchema = z
    .object({
        _id: z.string().optional().describe('The lemlist identifier of the removed lead. Example: "lea_8RmJYElD9S5Jp2kyv"'),
        email: z.string().optional().describe('The email address of the removed lead. Example: "alex.doe@example.com"'),
        firstName: z.string().optional().describe('The first name of the removed lead. Example: "Alex"'),
        lastName: z.string().optional().describe('The last name of the removed lead. Example: "Doe"'),
        companyName: z.string().optional().describe('The company name of the removed lead. Example: "Acme Inc"'),
        jobTitle: z.string().optional().describe('The job title of the removed lead. Example: "Head of Growth"'),
        isPaused: z.boolean().optional().describe('Whether the lead was paused in the campaign at time of removal. Example: false'),
        campaignId: z.string().optional().describe('The unique identifier of the campaign the lead was removed from. Example: "cam_8qJ1qAE5tekBYkJac"'),
        contactId: z.string().optional().describe('The lemlist contact identifier linked to the removed lead. Example: "ctc_joap8q9YGlV45Ypc6"')
    })
    .describe('The lead object as it was at the time of removal');

const ProviderLeadSchema = z.object({
    _id: z.string().optional(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    jobTitle: z.string().optional(),
    isPaused: z.boolean().optional(),
    campaignId: z.string().optional(),
    contactId: z.string().optional()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Removes a lead from a campaign via a provider DELETE, which stops the lead in the campaign sequence.
 * @pitfalls: Removal unsubscribes (graveyards) the email in this campaign, so re-adding it to the same campaign fails afterward. Removing a lead that is not in the campaign, including one already removed, fails with a 404 error.
 */
const action = createAction({
    description: 'Remove a lead from a campaign (stops it in the campaign sequence).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.lemlist.com/api-reference/endpoints/leads/unsubscribe-lead-from-campaign
        const response = await nango.delete({
            endpoint: `/api/campaigns/${encodeURIComponent(input.campaignId)}/leads/${encodeURIComponent(input.email)}`,
            // No idempotency key: a retry after a lost response would repeat the removal and 404 once the lead is already gone, so disable automatic retries.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const lead = ProviderLeadSchema.parse(response.data);

        return {
            ...(lead._id !== undefined && { _id: lead._id }),
            ...(lead.email !== undefined && { email: lead.email }),
            ...(lead.firstName !== undefined && { firstName: lead.firstName }),
            ...(lead.lastName !== undefined && { lastName: lead.lastName }),
            ...(lead.companyName !== undefined && { companyName: lead.companyName }),
            ...(lead.jobTitle !== undefined && { jobTitle: lead.jobTitle }),
            ...(lead.isPaused !== undefined && { isPaused: lead.isPaused }),
            ...(lead.campaignId !== undefined && { campaignId: lead.campaignId }),
            ...(lead.contactId !== undefined && { contactId: lead.contactId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
