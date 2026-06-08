import { z } from 'zod';
import { createAction } from 'nango';

const MilestoneSchema = z.object({
    id: z.number(),
    employeeGoalId: z.number(),
    title: z.string(),
    currentValue: z.number().nullable().optional(),
    startValue: z.number().nullable().optional(),
    endValue: z.number().nullable().optional(),
    completedDateTime: z.string().nullable().optional(),
    lastUpdateDateTime: z.string(),
    lastUpdateUserId: z.number()
});

const GoalSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    percentComplete: z.number(),
    alignsWithOptionId: z.string().nullable().optional(),
    sharedWithEmployeeIds: z.array(z.number()),
    dueDate: z.string(),
    completionDate: z.string().nullable().optional(),
    lastChangedDateTime: z.string().nullable().optional(),
    status: z.enum(['in_progress', 'completed', 'closed']),
    milestones: z.array(MilestoneSchema).nullable().optional(),
    actions: z
        .object({
            canEditGoalProgressBar: z.boolean(),
            canEditGoalMilestoneProgressBar: z.boolean()
        })
        .nullable()
        .optional()
});

const ProviderResponseSchema = z.object({
    goal: GoalSchema
});

const InputSchema = z.object({
    employeeId: z.number().int().describe('Employee ID with whom the goal is associated. Example: 123'),
    goalId: z.number().int().describe('Goal ID for the specified employee. Example: 456'),
    title: z.string().describe('The title of the goal'),
    description: z.string().optional().describe('A detailed description of the goal'),
    dueDate: z.string().describe('The due date for the goal in YYYY-MM-DD format'),
    percentComplete: z.number().min(0).max(100).optional().describe('The percentage of completion for the goal (0-100)'),
    completionDate: z.string().nullable().optional().describe('The date the goal was completed in YYYY-MM-DD format'),
    sharedWithEmployeeIds: z
        .array(z.number().int())
        .describe('List of employee IDs with whom the goal is shared. Must include the employee ID of the goal owner.'),
    alignsWithOptionId: z.string().nullable().optional().describe('The option ID that aligns with this goal')
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    percentComplete: z.number(),
    alignsWithOptionId: z.string().nullable().optional(),
    sharedWithEmployeeIds: z.array(z.number()),
    dueDate: z.string(),
    completionDate: z.string().nullable().optional(),
    lastChangedDateTime: z.string().nullable().optional(),
    status: z.enum(['in_progress', 'completed', 'closed']),
    milestones: z.array(MilestoneSchema).nullable().optional(),
    actions: z
        .object({
            canEditGoalProgressBar: z.boolean(),
            canEditGoalMilestoneProgressBar: z.boolean()
        })
        .nullable()
        .optional()
});

const action = createAction({
    description: 'Update a performance goal for an employee in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-employee-goal',
        group: 'Performance Management'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.bamboohr.com/reference/update-goal-v1
        const response = await nango.put({
            endpoint: `/v1/performance/employees/${encodeURIComponent(String(input.employeeId))}/goals/${encodeURIComponent(String(input.goalId))}`,
            data: {
                title: input.title,
                ...(input.description !== undefined && { description: input.description }),
                dueDate: input.dueDate,
                ...(input.percentComplete !== undefined && { percentComplete: input.percentComplete }),
                ...(input.completionDate !== undefined && { completionDate: input.completionDate }),
                sharedWithEmployeeIds: input.sharedWithEmployeeIds,
                ...(input.alignsWithOptionId !== undefined && { alignsWithOptionId: input.alignsWithOptionId })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Goal not found or could not be updated.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const goal = providerResponse.goal;

        return {
            id: goal.id,
            title: goal.title,
            ...(goal.description != null && { description: goal.description }),
            percentComplete: goal.percentComplete,
            ...(goal.alignsWithOptionId != null && { alignsWithOptionId: goal.alignsWithOptionId }),
            sharedWithEmployeeIds: goal.sharedWithEmployeeIds,
            dueDate: goal.dueDate,
            ...(goal.completionDate != null && { completionDate: goal.completionDate }),
            ...(goal.lastChangedDateTime != null && { lastChangedDateTime: goal.lastChangedDateTime }),
            status: goal.status,
            ...(goal.milestones != null && { milestones: goal.milestones }),
            ...(goal.actions != null && { actions: goal.actions })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
