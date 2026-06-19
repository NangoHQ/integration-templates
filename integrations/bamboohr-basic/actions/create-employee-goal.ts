import { z } from 'zod';
import { createAction } from 'nango';

const MilestoneInputSchema = z.object({
    title: z.string()
});

const InputSchema = z.object({
    employeeId: z.number().int().describe('The employee ID with whom the goal is associated. Example: 123'),
    title: z.string().describe('The title of the goal'),
    description: z.string().optional().describe('A detailed description of the goal'),
    dueDate: z.string().describe('The due date for the goal in YYYY-MM-DD format'),
    percentComplete: z
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .describe('Initial percentage of completion for a simple goal (0-100). Defaults to 0 if omitted. Ignored when milestones is provided.'),
    completionDate: z.string().optional().describe('The date when the goal was completed in YYYY-MM-DD format. Only valid when percentComplete is 100.'),
    sharedWithEmployeeIds: z
        .array(z.number().int())
        .describe('List of employee IDs with whom the goal is shared. Must include the employee ID of the goal owner.'),
    alignsWithOptionId: z.number().int().nullable().optional().describe('ID of the option this goal aligns with'),
    milestones: z
        .array(MilestoneInputSchema)
        .optional()
        .describe('Optional. Provide a non-empty array of milestone objects to create a milestone-based goal. Omit this field to create a simple goal.')
});

const MilestoneSchema = z.object({
    id: z.number().int().optional(),
    employeeGoalId: z.number().int().optional(),
    title: z.string().optional(),
    currentValue: z.number().nullable().optional(),
    startValue: z.number().nullable().optional(),
    endValue: z.number().nullable().optional(),
    completedDateTime: z.string().nullable().optional(),
    lastUpdateDateTime: z.string().nullable().optional(),
    lastUpdateUserId: z.number().int().nullable().optional()
});

const GoalActionsSchema = z.object({
    canEditGoalProgressBar: z.boolean().optional(),
    canEditGoalMilestoneProgressBar: z.boolean().optional()
});

const GoalSchema = z.object({
    id: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    percentComplete: z.number().int().nullable().optional(),
    alignsWithOptionId: z.string().nullable().optional(),
    sharedWithEmployeeIds: z.array(z.number().int()).nullable().optional(),
    dueDate: z.string().nullable().optional(),
    completionDate: z.string().nullable().optional(),
    lastChangedDateTime: z.string().nullable().optional(),
    status: z.enum(['in_progress', 'completed', 'closed']).nullable().optional(),
    milestones: z.array(MilestoneSchema).nullable().optional(),
    actions: GoalActionsSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    goal: GoalSchema.optional()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    percentComplete: z.number().int().optional(),
    alignsWithOptionId: z.string().optional(),
    sharedWithEmployeeIds: z.array(z.number().int()).optional(),
    dueDate: z.string().optional(),
    completionDate: z.string().optional(),
    lastChangedDateTime: z.string().optional(),
    status: z.enum(['in_progress', 'completed', 'closed']).optional(),
    milestones: z.array(MilestoneSchema).optional(),
    actions: GoalActionsSchema.optional()
});

const action = createAction({
    description: 'Create a performance goal for an employee in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody = {
            title: input.title,
            dueDate: input.dueDate,
            sharedWithEmployeeIds: input.sharedWithEmployeeIds,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.percentComplete !== undefined && { percentComplete: input.percentComplete }),
            ...(input.completionDate !== undefined && { completionDate: input.completionDate }),
            ...(input.alignsWithOptionId !== undefined && { alignsWithOptionId: input.alignsWithOptionId }),
            ...(input.milestones !== undefined && { milestones: input.milestones })
        };

        const response = await nango.post({
            // https://documentation.bamboohr.com/reference/create-goal
            endpoint: `v1/performance/employees/${encodeURIComponent(String(input.employeeId))}/goals`,
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const goal = parsed.goal;

        if (!goal) {
            throw new nango.ActionError({
                type: 'missing_response',
                message: 'The provider response did not include the expected goal object.'
            });
        }

        return {
            ...(goal.id != null && { id: goal.id }),
            ...(goal.title != null && { title: goal.title }),
            ...(goal.description != null && { description: goal.description }),
            ...(goal.percentComplete != null && { percentComplete: goal.percentComplete }),
            ...(goal.alignsWithOptionId != null && { alignsWithOptionId: goal.alignsWithOptionId }),
            ...(goal.sharedWithEmployeeIds != null && { sharedWithEmployeeIds: goal.sharedWithEmployeeIds }),
            ...(goal.dueDate != null && { dueDate: goal.dueDate }),
            ...(goal.completionDate != null && { completionDate: goal.completionDate }),
            ...(goal.lastChangedDateTime != null && { lastChangedDateTime: goal.lastChangedDateTime }),
            ...(goal.status != null && { status: goal.status }),
            ...(goal.milestones != null && { milestones: goal.milestones }),
            ...(goal.actions != null && { actions: goal.actions })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
