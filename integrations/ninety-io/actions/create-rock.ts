import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    teamId: z.string().describe('Team ID to assign the rock to. Example: "6a616ba8908190d6d9458153"'),
    title: z.string().describe('Title of the rock.'),
    dueDate: z.string().describe('Due date in ISO 8601 format. Example: "2026-12-31T00:00:00Z"'),
    statusCode: z.enum(['OFF_TRACK', 'ON_TRACK', 'DONE', 'CANCELED']).describe('Status of the rock.'),
    levelCode: z.enum(['USER', 'COMPANY_AND_DEPARTMENT', 'COMPANY', 'DEPARTMENT']).describe('Level of the rock.'),
    quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'None']).describe('Quarter of the rock.'),
    description: z.string().optional().describe('Description of the rock.'),
    notes: z.string().optional().describe('Notes for the rock.'),
    assigneeIds: z.array(z.string()).optional().describe('User IDs to assign the rock to.')
});

const ProviderMilestoneSchema = z
    .object({
        _id: z.string(),
        title: z.string(),
        dueDate: z.string(),
        description: z.string().nullable().optional(),
        isDone: z.boolean().optional(),
        isDeleted: z.boolean().optional(),
        completedDate: z.string().nullable().optional(),
        createdDate: z.string().optional(),
        updatedAt: z.string().nullable().optional(),
        rockId: z.string().nullable().optional(),
        teamId: z.string().nullable().optional(),
        ownedByUserId: z.string().nullable().optional(),
        createdBy: z.string().nullable().optional()
    })
    .passthrough();

const MilestoneSchema = z.object({
    id: z.string(),
    title: z.string(),
    dueDate: z.string(),
    description: z.string().optional(),
    isDone: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    completedDate: z.string().optional(),
    createdDate: z.string().optional(),
    updatedAt: z.string().optional(),
    rockId: z.string().optional(),
    teamId: z.string().optional(),
    ownedByUserId: z.string().optional(),
    createdBy: z.string().optional()
});

const ProviderRockSchema = z.object({
    _id: z.string(),
    teamId: z.string(),
    title: z.string(),
    dueDate: z.string(),
    statusCode: z.string(),
    levelCode: z.string(),
    quarter: z.string(),
    description: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    assigneeIds: z.array(z.string()).optional(),
    createdByUserId: z.string().optional(),
    updatedBy: z.string().nullable().optional(),
    createdDate: z.string().optional(),
    updatedAt: z.string().nullable().optional(),
    milestones: z.array(ProviderMilestoneSchema).nullable().optional(),
    userId: z.string().optional(),
    companyId: z.string().optional(),
    completed: z.boolean().optional(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional(),
    followers: z.array(z.string()).optional(),
    completedDate: z.string().nullable().optional(),
    archivedDate: z.string().nullable().optional(),
    ordinal: z.number().optional(),
    userOrdinal: z.number().optional(),
    planningBoardOrdinal: z.number().optional(),
    dueDateQuarter: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    teamId: z.string(),
    title: z.string(),
    dueDate: z.string(),
    statusCode: z.string(),
    levelCode: z.string(),
    quarter: z.string(),
    description: z.string().optional(),
    notes: z.string().optional(),
    assigneeIds: z.array(z.string()).optional(),
    createdByUserId: z.string().optional(),
    updatedBy: z.string().optional(),
    createdDate: z.string().optional(),
    updatedAt: z.string().optional(),
    milestones: z.array(MilestoneSchema).optional(),
    userId: z.string().optional(),
    companyId: z.string().optional(),
    completed: z.boolean().optional(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional(),
    followers: z.array(z.string()).optional(),
    completedDate: z.string().optional(),
    archivedDate: z.string().optional(),
    ordinal: z.number().optional(),
    userOrdinal: z.number().optional(),
    planningBoardOrdinal: z.number().optional(),
    dueDateQuarter: z.string().optional()
});

const action = createAction({
    description: 'Create a rock assigned to the authenticated user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: Omit<ProxyConfiguration, 'method'> = {
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: '/v1/rocks',
            data: {
                rock: {
                    teamId: input.teamId,
                    title: input.title,
                    dueDate: input.dueDate,
                    statusCode: input.statusCode,
                    levelCode: input.levelCode,
                    quarter: input.quarter,
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.notes !== undefined && { notes: input.notes }),
                    ...(input.assigneeIds !== undefined && { assigneeIds: input.assigneeIds })
                }
            },
            retries: 1
        };

        const response = await nango.post(config);
        const providerRocks = z.array(ProviderRockSchema).parse(response.data);
        const providerRock = providerRocks[0];

        if (!providerRock) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Provider returned an empty array after creating the rock.'
            });
        }

        return {
            id: providerRock._id,
            teamId: providerRock.teamId,
            title: providerRock.title,
            dueDate: providerRock.dueDate,
            statusCode: providerRock.statusCode,
            levelCode: providerRock.levelCode,
            quarter: providerRock.quarter,
            ...(providerRock.description != null && { description: providerRock.description }),
            ...(providerRock.notes != null && { notes: providerRock.notes }),
            ...(providerRock.assigneeIds !== undefined && { assigneeIds: providerRock.assigneeIds }),
            ...(providerRock.createdByUserId !== undefined && { createdByUserId: providerRock.createdByUserId }),
            ...(providerRock.updatedBy != null && { updatedBy: providerRock.updatedBy }),
            ...(providerRock.createdDate !== undefined && { createdDate: providerRock.createdDate }),
            ...(providerRock.updatedAt != null && { updatedAt: providerRock.updatedAt }),
            ...(providerRock.milestones != null && {
                milestones: providerRock.milestones.map((milestone) => ({
                    id: milestone._id,
                    title: milestone.title,
                    dueDate: milestone.dueDate,
                    ...(milestone.description != null && { description: milestone.description }),
                    ...(milestone.isDone !== undefined && { isDone: milestone.isDone }),
                    ...(milestone.isDeleted !== undefined && { isDeleted: milestone.isDeleted }),
                    ...(milestone.completedDate != null && { completedDate: milestone.completedDate }),
                    ...(milestone.createdDate !== undefined && { createdDate: milestone.createdDate }),
                    ...(milestone.updatedAt != null && { updatedAt: milestone.updatedAt }),
                    ...(milestone.rockId != null && { rockId: milestone.rockId }),
                    ...(milestone.teamId != null && { teamId: milestone.teamId }),
                    ...(milestone.ownedByUserId != null && { ownedByUserId: milestone.ownedByUserId }),
                    ...(milestone.createdBy != null && { createdBy: milestone.createdBy })
                }))
            }),
            ...(providerRock.userId !== undefined && { userId: providerRock.userId }),
            ...(providerRock.companyId !== undefined && { companyId: providerRock.companyId }),
            ...(providerRock.completed !== undefined && { completed: providerRock.completed }),
            ...(providerRock.archived !== undefined && { archived: providerRock.archived }),
            ...(providerRock.deleted !== undefined && { deleted: providerRock.deleted }),
            ...(providerRock.followers !== undefined && { followers: providerRock.followers }),
            ...(providerRock.completedDate != null && { completedDate: providerRock.completedDate }),
            ...(providerRock.archivedDate != null && { archivedDate: providerRock.archivedDate }),
            ...(providerRock.ordinal !== undefined && { ordinal: providerRock.ordinal }),
            ...(providerRock.userOrdinal !== undefined && { userOrdinal: providerRock.userOrdinal }),
            ...(providerRock.planningBoardOrdinal !== undefined && { planningBoardOrdinal: providerRock.planningBoardOrdinal }),
            ...(providerRock.dueDateQuarter !== undefined && { dueDateQuarter: providerRock.dueDateQuarter })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
