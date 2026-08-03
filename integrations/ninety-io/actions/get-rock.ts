import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the rock. Example: "6a61d2d0441c43ad0eaabd3c"')
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
        ownedByUserId: z.string().nullable().optional()
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
    ownedByUserId: z.string().optional()
});

const ProviderRockSchema = z
    .object({
        _id: z.string(),
        completed: z.boolean(),
        archived: z.boolean(),
        deleted: z.boolean(),
        description: z.string().nullable().optional(),
        title: z.string(),
        comments: z.array(z.unknown()),
        teamId: z.string(),
        dueDate: z.string(),
        statusCode: z.enum(['OFF_TRACK', 'ON_TRACK', 'DONE', 'CANCELED']),
        levelCode: z.enum(['USER', 'COMPANY_AND_DEPARTMENT', 'COMPANY', 'DEPARTMENT']),
        quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'None']),
        companyId: z.string(),
        userId: z.string(),
        archivedDate: z.string().nullable(),
        completedDate: z.string().nullable(),
        createdDate: z.string(),
        updatedAt: z.string().nullable(),
        updatedBy: z.string().nullable(),
        ordinal: z.number(),
        userOrdinal: z.number(),
        planningBoardOrdinal: z.number(),
        followers: z.array(z.string()),
        milestones: z.array(ProviderMilestoneSchema),
        createdByUserId: z.string(),
        dueDateQuarter: z.string(),
        originalDueDate: z.string().nullable(),
        attachments: z.array(z.unknown())
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    completed: z.boolean().optional(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional(),
    description: z.string().optional(),
    title: z.string(),
    comments: z.array(z.unknown()).optional(),
    teamId: z.string(),
    dueDate: z.string(),
    statusCode: z.enum(['OFF_TRACK', 'ON_TRACK', 'DONE', 'CANCELED']),
    levelCode: z.enum(['USER', 'COMPANY_AND_DEPARTMENT', 'COMPANY', 'DEPARTMENT']),
    quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'None']),
    companyId: z.string().optional(),
    userId: z.string().optional(),
    archivedDate: z.string().optional(),
    completedDate: z.string().optional(),
    createdDate: z.string().optional(),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
    ordinal: z.number().optional(),
    userOrdinal: z.number().optional(),
    planningBoardOrdinal: z.number().optional(),
    followers: z.array(z.string()).optional(),
    milestones: z.array(MilestoneSchema).optional(),
    createdByUserId: z.string().optional(),
    dueDateQuarter: z.string().optional(),
    originalDueDate: z.string().optional(),
    attachments: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single rock by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/rocks/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Rock not found',
                id: input.id
            });
        }

        const providerRock = ProviderRockSchema.parse(response.data);

        return {
            id: providerRock._id,
            completed: providerRock.completed,
            archived: providerRock.archived,
            deleted: providerRock.deleted,
            ...(providerRock.description != null && { description: providerRock.description }),
            title: providerRock.title,
            comments: providerRock.comments,
            teamId: providerRock.teamId,
            dueDate: providerRock.dueDate,
            statusCode: providerRock.statusCode,
            levelCode: providerRock.levelCode,
            quarter: providerRock.quarter,
            companyId: providerRock.companyId,
            userId: providerRock.userId,
            ...(providerRock.archivedDate != null && { archivedDate: providerRock.archivedDate }),
            ...(providerRock.completedDate != null && { completedDate: providerRock.completedDate }),
            createdDate: providerRock.createdDate,
            ...(providerRock.updatedAt != null && { updatedAt: providerRock.updatedAt }),
            ...(providerRock.updatedBy != null && { updatedBy: providerRock.updatedBy }),
            ordinal: providerRock.ordinal,
            userOrdinal: providerRock.userOrdinal,
            planningBoardOrdinal: providerRock.planningBoardOrdinal,
            followers: providerRock.followers,
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
                ...(milestone.ownedByUserId != null && { ownedByUserId: milestone.ownedByUserId })
            })),
            createdByUserId: providerRock.createdByUserId,
            dueDateQuarter: providerRock.dueDateQuarter,
            ...(providerRock.originalDueDate != null && { originalDueDate: providerRock.originalDueDate }),
            attachments: providerRock.attachments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
