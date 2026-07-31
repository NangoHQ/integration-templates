import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('The unique identifier of the issue. Example: "6a68fb4f2f9e9442985c809d"')
});

const ProviderIssueSchema = z
    .object({
        _id: z.string(),
        title: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        teamId: z.string().optional().nullable(),
        userId: z.string().optional().nullable(),
        createdBy: z.string().optional().nullable(),
        createdByUserId: z.string().optional().nullable(),
        createdDate: z.string().optional().nullable(),
        updatedDate: z.string().optional().nullable(),
        archived: z.boolean().optional().nullable(),
        completed: z.boolean().optional().nullable(),
        deleted: z.boolean().optional().nullable(),
        intervalCode: z.string().optional().nullable(),
        companyId: z.string().optional().nullable(),
        ordinal: z.number().optional().nullable(),
        planningBoardOrdinal: z.number().optional().nullable(),
        followers: z.array(z.string()).optional().nullable(),
        who: z.string().optional().nullable(),
        imported: z.boolean().optional().nullable(),
        numOfLikes: z.number().optional().nullable(),
        attachments: z.array(z.unknown()).optional().nullable(),
        comments: z.array(z.unknown()).optional().nullable(),
        likes: z.array(z.unknown()).optional().nullable(),
        rating: z.unknown().optional().nullable(),
        archivedDate: z.string().optional().nullable(),
        completedDate: z.string().optional().nullable(),
        originalDueDate: z.string().optional().nullable(),
        user: z.record(z.string(), z.unknown()).optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    teamId: z.string().optional(),
    userId: z.string().optional(),
    createdBy: z.string().optional(),
    createdByUserId: z.string().optional(),
    createdDate: z.string().optional(),
    updatedDate: z.string().optional(),
    archived: z.boolean().optional(),
    completed: z.boolean().optional(),
    deleted: z.boolean().optional(),
    intervalCode: z.string().optional(),
    companyId: z.string().optional(),
    ordinal: z.number().optional(),
    planningBoardOrdinal: z.number().optional(),
    followers: z.array(z.string()).optional(),
    who: z.string().optional(),
    imported: z.boolean().optional(),
    numOfLikes: z.number().optional(),
    attachments: z.array(z.unknown()).optional(),
    comments: z.array(z.unknown()).optional(),
    likes: z.array(z.unknown()).optional(),
    rating: z.unknown().optional(),
    archivedDate: z.string().optional().nullable(),
    completedDate: z.string().optional().nullable(),
    originalDueDate: z.string().optional().nullable(),
    user: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single issue by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/issues/${encodeURIComponent(input.issueId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Issue not found',
                issueId: input.issueId
            });
        }

        const providerIssue = ProviderIssueSchema.parse(response.data);

        return {
            id: providerIssue._id,
            ...(providerIssue.title != null && { title: providerIssue.title }),
            ...(providerIssue.description != null && { description: providerIssue.description }),
            ...(providerIssue.teamId != null && { teamId: providerIssue.teamId }),
            ...(providerIssue.userId != null && { userId: providerIssue.userId }),
            ...(providerIssue.createdBy != null && { createdBy: providerIssue.createdBy }),
            ...(providerIssue.createdByUserId != null && { createdByUserId: providerIssue.createdByUserId }),
            ...(providerIssue.createdDate != null && { createdDate: providerIssue.createdDate }),
            ...(providerIssue.updatedDate != null && { updatedDate: providerIssue.updatedDate }),
            ...(providerIssue.archived != null && { archived: providerIssue.archived }),
            ...(providerIssue.completed != null && { completed: providerIssue.completed }),
            ...(providerIssue.deleted != null && { deleted: providerIssue.deleted }),
            ...(providerIssue.intervalCode != null && { intervalCode: providerIssue.intervalCode }),
            ...(providerIssue.companyId != null && { companyId: providerIssue.companyId }),
            ...(providerIssue.ordinal != null && { ordinal: providerIssue.ordinal }),
            ...(providerIssue.planningBoardOrdinal != null && { planningBoardOrdinal: providerIssue.planningBoardOrdinal }),
            ...(providerIssue.followers != null && { followers: providerIssue.followers }),
            ...(providerIssue.who != null && { who: providerIssue.who }),
            ...(providerIssue.imported != null && { imported: providerIssue.imported }),
            ...(providerIssue.numOfLikes != null && { numOfLikes: providerIssue.numOfLikes }),
            ...(providerIssue.attachments != null && { attachments: providerIssue.attachments }),
            ...(providerIssue.comments != null && { comments: providerIssue.comments }),
            ...(providerIssue.likes != null && { likes: providerIssue.likes }),
            ...(providerIssue.rating !== undefined && { rating: providerIssue.rating }),
            ...(providerIssue.archivedDate != null && { archivedDate: providerIssue.archivedDate }),
            ...(providerIssue.completedDate != null && { completedDate: providerIssue.completedDate }),
            ...(providerIssue.originalDueDate != null && { originalDueDate: providerIssue.originalDueDate }),
            ...(providerIssue.user != null && { user: providerIssue.user })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
