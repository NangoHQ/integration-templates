import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Milestone ID. Example: "6a61758b5346be5d56149d9f"')
});

const MilestoneSchema = z
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
    description: 'Retrieve a single milestone by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            endpoint: `/v1/milestones/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Milestone with id ${input.id} not found.`,
                id: input.id
            });
        }

        const milestone = MilestoneSchema.parse(response.data);

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
            ...(milestone.updatedBy != null && { updatedBy: milestone.updatedBy }),
            ...(milestone.toDoId != null && { toDoId: milestone.toDoId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
