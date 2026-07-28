import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    rockId: z.string().describe('The ID of the Rock to link the milestone to. Example: "6a6175355346be5d56149d93"'),
    title: z.string().describe('The title of the milestone. Example: "Complete phase 1"'),
    dueDate: z.string().describe('The due date of the milestone in ISO 8601 format. Example: "2026-12-31T00:00:00Z"'),
    teamId: z.string().describe('The ID of the team the milestone belongs to. Example: "6a616ba8908190d6d9458153"'),
    description: z.string().optional().describe('Optional description of the milestone.'),
    isDone: z.boolean().optional().describe('Whether the milestone is completed.'),
    completedDate: z.string().optional().describe('The completion date in ISO 8601 format. Required when isDone is true.'),
    userOrdinal: z.number().optional().describe('Optional user-defined order.'),
    toDoId: z.string().optional().describe('Optional linked To-Do ID.')
});

const MilestoneSchema = z.object({
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
    followers: z.array(z.unknown()).nullable().optional(),
    createdBy: z.string().nullable().optional(),
    createdDate: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    toDoId: z.string().nullable().optional()
});

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
    followers: z.array(z.unknown()).optional(),
    createdBy: z.string().optional(),
    createdDate: z.string().optional(),
    updatedAt: z.string().optional(),
    toDoId: z.string().optional()
});

const action = createAction({
    description: 'Create a milestone linked to a rock',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            rockId: input.rockId,
            title: input.title,
            dueDate: input.dueDate,
            teamId: input.teamId
        };

        if (input.description !== undefined) {
            payload['description'] = input.description;
        }
        if (input.isDone !== undefined) {
            payload['isDone'] = input.isDone;
        }
        if (input.completedDate !== undefined) {
            payload['completedDate'] = input.completedDate;
        }
        if (input.userOrdinal !== undefined) {
            payload['userOrdinal'] = input.userOrdinal;
        }
        if (input.toDoId !== undefined) {
            payload['toDoId'] = input.toDoId;
        }

        const response = await nango.post({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            // https://api.public.ninety.io/v1/swagger
            endpoint: '/v1/milestones',
            data: payload,
            retries: 10
        });

        const parsed = MilestoneSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API returned an unexpected milestone response shape.',
                details: parsed.error.issues
            });
        }

        const milestone = parsed.data;

        return {
            id: milestone._id,
            ...(milestone.companyId != null && { companyId: milestone.companyId }),
            ...(milestone.rockId != null && { rockId: milestone.rockId }),
            ...(milestone.teamId != null && { teamId: milestone.teamId }),
            ...(milestone.ownedByUserId != null && { ownedByUserId: milestone.ownedByUserId }),
            ...(milestone.title != null && { title: milestone.title }),
            ...(milestone.description != null && { description: milestone.description }),
            ...(milestone.dueDate != null && { dueDate: milestone.dueDate }),
            ...(milestone.isDone != null && { isDone: milestone.isDone }),
            ...(milestone.isDeleted != null && { isDeleted: milestone.isDeleted }),
            ...(milestone.completedDate != null && { completedDate: milestone.completedDate }),
            ...(milestone.userOrdinal != null && { userOrdinal: milestone.userOrdinal }),
            ...(milestone.followers != null && { followers: milestone.followers }),
            ...(milestone.createdBy != null && { createdBy: milestone.createdBy }),
            ...(milestone.createdDate != null && { createdDate: milestone.createdDate }),
            ...(milestone.updatedAt != null && { updatedAt: milestone.updatedAt }),
            ...(milestone.toDoId != null && { toDoId: milestone.toDoId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
