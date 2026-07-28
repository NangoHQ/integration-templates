import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Milestone ID. Example: "6a61758b5346be5d56149d9f"')
});

const MilestoneSchema = z.object({
    _id: z.string(),
    title: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    rockId: z.string().nullable().optional(),
    teamId: z.string().nullable().optional(),
    createdDate: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    createdByUserId: z.string().nullable().optional(),
    completed: z.boolean().nullable().optional(),
    completedDate: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    dueDate: z.string().optional(),
    status: z.string().optional(),
    rockId: z.string().optional(),
    teamId: z.string().optional(),
    createdDate: z.string().optional(),
    updatedAt: z.string().optional(),
    createdByUserId: z.string().optional(),
    completed: z.boolean().optional(),
    completedDate: z.string().optional()
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
            ...(milestone.title != null && { title: milestone.title }),
            ...(milestone.dueDate != null && { dueDate: milestone.dueDate }),
            ...(milestone.status != null && { status: milestone.status }),
            ...(milestone.rockId != null && { rockId: milestone.rockId }),
            ...(milestone.teamId != null && { teamId: milestone.teamId }),
            ...(milestone.createdDate != null && { createdDate: milestone.createdDate }),
            ...(milestone.updatedAt != null && { updatedAt: milestone.updatedAt }),
            ...(milestone.createdByUserId != null && { createdByUserId: milestone.createdByUserId }),
            ...(milestone.completed != null && { completed: milestone.completed }),
            ...(milestone.completedDate != null && { completedDate: milestone.completedDate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
