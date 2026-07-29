import { z } from 'zod';
import { createAction } from 'nango';

const StatusCodeSchema = z.enum(['OFF_TRACK', 'ON_TRACK', 'DONE', 'CANCELED']);
const LevelCodeSchema = z.enum(['USER', 'COMPANY_AND_DEPARTMENT', 'COMPANY', 'DEPARTMENT']);
const QuarterSchema = z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'None']);

const MilestoneSchema = z
    .object({
        _id: z.string(),
        rockId: z.string().nullable().optional(),
        teamId: z.string().nullable().optional(),
        ownedByUserId: z.string().nullable().optional(),
        title: z.string(),
        dueDate: z.string(),
        description: z.string().nullable().optional(),
        isDone: z.boolean().optional(),
        isDeleted: z.boolean().optional(),
        completedDate: z.string().nullable().optional(),
        createdBy: z.string().nullable().optional(),
        createdDate: z.string().optional(),
        updatedAt: z.string().nullable().optional()
    })
    .passthrough();

const InputSchema = z.object({
    id: z.string().describe('Rock ID. Example: "6a6175355346be5d56149d93"'),
    title: z.string().optional().describe('Rock title'),
    description: z.string().nullable().optional().describe('Rock description'),
    dueDate: z.string().optional().describe('Due date in ISO 8601 format. Example: "2026-12-31T00:00:00Z"'),
    statusCode: StatusCodeSchema.optional().describe('Status code'),
    levelCode: LevelCodeSchema.optional().describe('Level code'),
    quarter: QuarterSchema.optional().describe('Quarter'),
    teamId: z.string().optional().describe('Team ID'),
    notes: z.string().nullable().optional().describe('Notes'),
    assigneeId: z.string().nullable().optional().describe('Assignee user ID')
});

const ProviderRockSchema = z.object({
    _id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    dueDate: z.string(),
    statusCode: StatusCodeSchema,
    levelCode: LevelCodeSchema,
    quarter: QuarterSchema,
    teamId: z.string(),
    notes: z.string().nullable().optional(),
    assigneeId: z.string().nullable().optional(),
    createdByUserId: z.string(),
    createdDate: z.string(),
    updatedAt: z.string().nullable().optional(),
    updatedBy: z.string().nullable().optional(),
    deleted: z.boolean().optional(),
    deletedDate: z.string().nullable().optional(),
    deletedByUserId: z.string().nullable().optional(),
    milestones: z.array(MilestoneSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.string(),
    statusCode: StatusCodeSchema,
    levelCode: LevelCodeSchema,
    quarter: QuarterSchema,
    teamId: z.string(),
    notes: z.string().optional(),
    assigneeId: z.string().optional(),
    createdByUserId: z.string(),
    createdDate: z.string(),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
    deleted: z.boolean().optional(),
    deletedDate: z.string().optional(),
    deletedByUserId: z.string().optional(),
    milestones: z
        .array(
            z.object({
                id: z.string(),
                rockId: z.string().optional(),
                teamId: z.string().optional(),
                ownedByUserId: z.string().optional(),
                title: z.string(),
                dueDate: z.string(),
                description: z.string().optional(),
                isDone: z.boolean().optional(),
                isDeleted: z.boolean().optional(),
                completedDate: z.string().optional(),
                createdBy: z.string().optional(),
                createdDate: z.string().optional(),
                updatedAt: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Partially update a rock.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rockBody: Record<string, unknown> = {};

        if (input.title !== undefined) {
            rockBody['title'] = input.title;
        }
        if (input.description !== undefined) {
            rockBody['description'] = input.description;
        }
        if (input.dueDate !== undefined) {
            rockBody['dueDate'] = input.dueDate;
        }
        if (input.statusCode !== undefined) {
            rockBody['statusCode'] = input.statusCode;
        }
        if (input.levelCode !== undefined) {
            rockBody['levelCode'] = input.levelCode;
        }
        if (input.quarter !== undefined) {
            rockBody['quarter'] = input.quarter;
        }
        if (input.teamId !== undefined) {
            rockBody['teamId'] = input.teamId;
        }
        if (input.notes !== undefined) {
            rockBody['notes'] = input.notes;
        }
        if (input.assigneeId !== undefined) {
            rockBody['assigneeId'] = input.assigneeId;
        }

        // https://help.ninety.io/en/articles/15505694-api-reference-and-access
        const response = await nango.patch({
            endpoint: `/v1/rocks/${encodeURIComponent(input.id)}`,
            data: rockBody,
            retries: 3
        });

        const providerRock = ProviderRockSchema.parse(response.data);

        return {
            id: providerRock._id,
            title: providerRock.title,
            ...(providerRock.description != null && { description: providerRock.description }),
            dueDate: providerRock.dueDate,
            statusCode: providerRock.statusCode,
            levelCode: providerRock.levelCode,
            quarter: providerRock.quarter,
            teamId: providerRock.teamId,
            ...(providerRock.notes != null && { notes: providerRock.notes }),
            ...(providerRock.assigneeId != null && { assigneeId: providerRock.assigneeId }),
            createdByUserId: providerRock.createdByUserId,
            createdDate: providerRock.createdDate,
            ...(providerRock.updatedAt != null && { updatedAt: providerRock.updatedAt }),
            ...(providerRock.updatedBy != null && { updatedBy: providerRock.updatedBy }),
            ...(providerRock.deleted != null && { deleted: providerRock.deleted }),
            ...(providerRock.deletedDate != null && { deletedDate: providerRock.deletedDate }),
            ...(providerRock.deletedByUserId != null && { deletedByUserId: providerRock.deletedByUserId }),
            ...(providerRock.milestones != null && {
                milestones: providerRock.milestones.map((m) => ({
                    id: m._id,
                    title: m.title,
                    dueDate: m.dueDate,
                    ...(m.rockId != null && { rockId: m.rockId }),
                    ...(m.teamId != null && { teamId: m.teamId }),
                    ...(m.ownedByUserId != null && { ownedByUserId: m.ownedByUserId }),
                    ...(m.description != null && { description: m.description }),
                    ...(m.isDone !== undefined && { isDone: m.isDone }),
                    ...(m.isDeleted !== undefined && { isDeleted: m.isDeleted }),
                    ...(m.completedDate != null && { completedDate: m.completedDate }),
                    ...(m.createdBy != null && { createdBy: m.createdBy }),
                    ...(m.createdDate !== undefined && { createdDate: m.createdDate }),
                    ...(m.updatedAt != null && { updatedAt: m.updatedAt })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
