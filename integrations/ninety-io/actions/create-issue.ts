import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Issue title. Example: "Fix login bug"'),
    teamId: z.string().describe('Team ID. Example: "6a616ba8908190d6d9458153"')
});

const ProviderIssueSchema = z
    .object({
        _id: z.string(),
        title: z.string(),
        teamId: z.string(),
        companyId: z.string().optional(),
        createdByUserId: z.string().optional(),
        createdDate: z.string().optional(),
        updatedDate: z.string().nullish().optional(),
        notes: z.string().nullish().optional(),
        description: z.string().nullish().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    teamId: z.string(),
    companyId: z.string().optional(),
    createdByUserId: z.string().optional(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional(),
    notes: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Create an issue for a team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: '/v1/issues',
            data: {
                title: input.title,
                teamId: input.teamId
            },
            retries: 1
        });

        const providerIssue = ProviderIssueSchema.parse(response.data);

        return {
            id: providerIssue._id,
            title: providerIssue.title,
            teamId: providerIssue.teamId,
            ...(providerIssue.companyId !== undefined && { companyId: providerIssue.companyId }),
            ...(providerIssue.createdByUserId !== undefined && { createdByUserId: providerIssue.createdByUserId }),
            ...(providerIssue.createdDate !== undefined && { createdDate: providerIssue.createdDate }),
            ...(providerIssue.updatedDate != null && { updatedDate: providerIssue.updatedDate }),
            ...(providerIssue.notes != null && { notes: providerIssue.notes }),
            ...(providerIssue.description != null && { description: providerIssue.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
