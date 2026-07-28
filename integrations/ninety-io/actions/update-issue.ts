import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('The Issue Id. Example: "507f1f77bcf86cd799439011"'),
    title: z.string().optional().describe('Title of the Issue'),
    teamId: z.string().optional().describe('Id of the team that owns the Issue'),
    interval: z.enum(['SHORT_TERM', 'LONG_TERM']).optional().describe('Interval classification for the Issue'),
    description: z.string().optional().describe('HTML description of the Issue'),
    priority: z.number().min(0).max(5).optional().describe('Priority of the Issue: 0-5'),
    completed: z.boolean().optional().describe('Whether the Issue is completed')
});

const ProviderIssueResponseSchema = z.object({
    _id: z.string(),
    userId: z.string(),
    teamId: z.string(),
    companyId: z.string(),
    archived: z.boolean(),
    archivedDate: z.string().nullable().optional(),
    completed: z.boolean(),
    completedDate: z.string().nullable().optional(),
    createdBy: z.string(),
    deleted: z.boolean(),
    description: z.string().nullable().optional(),
    intervalCode: z.string().optional(),
    priority: z.number().optional(),
    title: z.string(),
    createdDate: z.string(),
    updatedDate: z.string().optional(),
    updatedByUserId: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    userId: z.string(),
    teamId: z.string(),
    companyId: z.string(),
    archived: z.boolean(),
    archivedDate: z.string().optional(),
    completed: z.boolean(),
    completedDate: z.string().optional(),
    createdBy: z.string(),
    deleted: z.boolean(),
    description: z.string().optional(),
    intervalCode: z.string().optional(),
    priority: z.number().optional(),
    title: z.string(),
    createdDate: z.string(),
    updatedDate: z.string().optional(),
    updatedByUserId: z.string().optional()
});

const action = createAction({
    description: 'Partially update an issue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config = {
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/issues/${encodeURIComponent(input.issueId)}`,
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.teamId !== undefined && { teamId: input.teamId }),
                ...(input.interval !== undefined && { interval: input.interval }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.completed !== undefined && { completed: input.completed })
            },
            retries: 3
        };

        const response = await nango.patch(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Issue not found or update failed',
                issueId: input.issueId
            });
        }

        const providerIssue = ProviderIssueResponseSchema.parse(response.data);

        return {
            id: providerIssue._id,
            userId: providerIssue.userId,
            teamId: providerIssue.teamId,
            companyId: providerIssue.companyId,
            archived: providerIssue.archived,
            ...(providerIssue.archivedDate != null && { archivedDate: providerIssue.archivedDate }),
            completed: providerIssue.completed,
            ...(providerIssue.completedDate != null && { completedDate: providerIssue.completedDate }),
            createdBy: providerIssue.createdBy,
            deleted: providerIssue.deleted,
            ...(providerIssue.description != null && { description: providerIssue.description }),
            ...(providerIssue.intervalCode !== undefined && { intervalCode: providerIssue.intervalCode }),
            ...(providerIssue.priority !== undefined && { priority: providerIssue.priority }),
            title: providerIssue.title,
            createdDate: providerIssue.createdDate,
            ...(providerIssue.updatedDate !== undefined && { updatedDate: providerIssue.updatedDate }),
            ...(providerIssue.updatedByUserId !== undefined && { updatedByUserId: providerIssue.updatedByUserId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
