import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Milestone ID. Example: "507f1f77bcf86cd799439014"'),
    title: z.string().optional().describe('Milestone title'),
    description: z.string().optional().describe('Milestone description'),
    dueDate: z.string().optional().describe('Due date in ISO 8601 format. Example: "2026-05-15T23:59:59.000Z"'),
    isDone: z.boolean().optional().describe('Whether the milestone is complete'),
    completedDate: z.string().optional().describe('Completion date in ISO 8601 format. Required when isDone is true.'),
    ownedByUserId: z.string().optional().describe('User ID to assign ownership to'),
    followers: z.array(z.string()).optional().describe('Array of user IDs to set as followers')
});

const ProviderMilestoneSchema = z
    .object({
        _id: z.string(),
        companyId: z.string().nullable().optional(),
        rockId: z.string().nullable().optional(),
        teamId: z.string().nullable().optional(),
        ownedByUserId: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        isDone: z.boolean().nullable().optional(),
        isDeleted: z.boolean().nullable().optional(),
        completedDate: z.string().nullable().optional(),
        userOrdinal: z.number().nullable().optional(),
        followers: z.array(z.string()).nullable().optional(),
        createdBy: z.string().nullable().optional(),
        createdDate: z.string().nullable().optional(),
        updatedAt: z.string().nullable().optional(),
        updatedBy: z.string().nullable().optional(),
        toDoId: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    companyId: z.string().optional(),
    rockId: z.string().optional(),
    teamId: z.string().optional(),
    ownedByUserId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    isDone: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    completedDate: z.string().optional(),
    userOrdinal: z.number().optional(),
    followers: z.array(z.string()).optional(),
    createdBy: z.string().optional(),
    createdDate: z.string().optional(),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
    toDoId: z.string().optional()
});

const action = createAction({
    description: 'Partially update a milestone.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const patchBody: Record<string, unknown> = {};
        if (input.title !== undefined) {
            patchBody['title'] = input.title;
        }
        if (input.description !== undefined) {
            patchBody['description'] = input.description;
        }
        if (input.dueDate !== undefined) {
            patchBody['dueDate'] = input.dueDate;
        }
        if (input.isDone !== undefined) {
            patchBody['isDone'] = input.isDone;
        }
        if (input.completedDate !== undefined) {
            patchBody['completedDate'] = input.completedDate;
        }
        if (input.ownedByUserId !== undefined) {
            patchBody['ownedByUserId'] = input.ownedByUserId;
        }
        if (input.followers !== undefined) {
            patchBody['followers'] = input.followers;
        }

        const response = await nango.patch({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/milestones/${encodeURIComponent(input.id)}`,
            data: patchBody,
            retries: 10
        });

        const providerMilestone = ProviderMilestoneSchema.parse(response.data);

        return {
            id: providerMilestone._id,
            ...(providerMilestone.companyId != null && { companyId: providerMilestone.companyId }),
            ...(providerMilestone.rockId != null && { rockId: providerMilestone.rockId }),
            ...(providerMilestone.teamId != null && { teamId: providerMilestone.teamId }),
            ...(providerMilestone.ownedByUserId != null && { ownedByUserId: providerMilestone.ownedByUserId }),
            ...(providerMilestone.title != null && { title: providerMilestone.title }),
            ...(providerMilestone.description != null && { description: providerMilestone.description }),
            ...(providerMilestone.dueDate != null && { dueDate: providerMilestone.dueDate }),
            ...(providerMilestone.isDone != null && { isDone: providerMilestone.isDone }),
            ...(providerMilestone.isDeleted != null && { isDeleted: providerMilestone.isDeleted }),
            ...(providerMilestone.completedDate != null && { completedDate: providerMilestone.completedDate }),
            ...(providerMilestone.userOrdinal != null && { userOrdinal: providerMilestone.userOrdinal }),
            ...(providerMilestone.followers != null && { followers: providerMilestone.followers }),
            ...(providerMilestone.createdBy != null && { createdBy: providerMilestone.createdBy }),
            ...(providerMilestone.createdDate != null && { createdDate: providerMilestone.createdDate }),
            ...(providerMilestone.updatedAt != null && { updatedAt: providerMilestone.updatedAt }),
            ...(providerMilestone.updatedBy != null && { updatedBy: providerMilestone.updatedBy }),
            ...(providerMilestone.toDoId != null && { toDoId: providerMilestone.toDoId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
