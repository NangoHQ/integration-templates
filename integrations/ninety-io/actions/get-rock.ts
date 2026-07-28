import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the rock. Example: "6a61d2d0441c43ad0eaabd3c"')
});

const MilestoneSchema = z
    .object({
        _id: z.string(),
        title: z.string(),
        dueDate: z.string(),
        completed: z.boolean().optional(),
        completedDate: z.string().optional(),
        createdDate: z.string().optional(),
        updatedAt: z.string().optional(),
        rockId: z.string().optional(),
        teamId: z.string().optional(),
        userId: z.string().optional()
    })
    .passthrough();

const ProviderRockSchema = z
    .object({
        _id: z.string(),
        completed: z.boolean(),
        archived: z.boolean(),
        deleted: z.boolean(),
        description: z.string(),
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
        milestones: z.array(MilestoneSchema),
        createdByUserId: z.string(),
        dueDateQuarter: z.string(),
        originalDueDate: z.string().nullable(),
        attachments: z.array(z.unknown())
    })
    .passthrough();

const OutputSchema = z
    .object({
        _id: z.string(),
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
    })
    .passthrough();

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

        const { archivedDate, completedDate, updatedAt, updatedBy, originalDueDate, ...rest } = providerRock;

        return {
            ...rest,
            ...(archivedDate != null && { archivedDate }),
            ...(completedDate != null && { completedDate }),
            ...(updatedAt != null && { updatedAt }),
            ...(updatedBy != null && { updatedBy }),
            ...(originalDueDate != null && { originalDueDate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
