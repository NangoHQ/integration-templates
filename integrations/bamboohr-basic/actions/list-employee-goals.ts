import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The employee ID to whom the goals are assigned. Example: "123"'),
    filter: z
        .enum(['status-inProgress', 'status-completed', 'status-closed', 'status-all'])
        .optional()
        .describe(
            'Goal status filter. Use status-inProgress for active goals, status-completed for completed goals, status-closed for closed goals, and status-all for all goals including closed.'
        )
});

const MilestoneSchema = z.object({
    id: z.number(),
    employeeGoalId: z.number(),
    title: z.string(),
    currentValue: z.number().nullable().optional(),
    startValue: z.number().nullable().optional(),
    endValue: z.number().nullable().optional(),
    completedDateTime: z.string().nullable().optional(),
    lastUpdateDateTime: z.string().nullable().optional(),
    lastUpdateUserId: z.number().nullable().optional()
});

const ActionsSchema = z.object({
    canEditGoalProgressBar: z.boolean().optional(),
    canEditGoalMilestoneProgressBar: z.boolean().optional()
});

const ProviderGoalSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    percentComplete: z.number().optional(),
    alignsWithOptionId: z.union([z.string(), z.null()]).optional(),
    sharedWithEmployeeIds: z.array(z.number()).optional(),
    dueDate: z.string().optional(),
    completionDate: z.union([z.string(), z.null()]).optional(),
    lastChangedDateTime: z.union([z.string(), z.null()]).optional(),
    status: z.string().optional(),
    milestones: z.union([z.array(MilestoneSchema), z.null()]).optional(),
    actions: z.union([ActionsSchema, z.null()]).optional()
});

const ProviderResponseSchema = z.object({
    goals: z.array(ProviderGoalSchema)
});

const GoalOutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    percentComplete: z.number().optional(),
    alignsWithOptionId: z.string().optional(),
    sharedWithEmployeeIds: z.array(z.number()).optional(),
    dueDate: z.string().optional(),
    completionDate: z.string().optional(),
    lastChangedDateTime: z.string().optional(),
    status: z.string().optional(),
    milestones: z.array(MilestoneSchema).optional(),
    actions: ActionsSchema.optional()
});

const OutputSchema = z.object({
    goals: z.array(GoalOutputSchema)
});

const action = createAction({
    description: 'List performance goals for an employee in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['goal'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.filter) {
            params['filter'] = input.filter;
        }

        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-goals
            endpoint: `/v1/performance/employees/${encodeURIComponent(input.employeeId)}/goals`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No goals data returned for the employee.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            goals: providerResponse.goals.map((goal) => ({
                id: goal.id,
                title: goal.title,
                ...(goal.description !== undefined && goal.description !== null && { description: goal.description }),
                ...(goal.percentComplete !== undefined && { percentComplete: goal.percentComplete }),
                ...(goal.alignsWithOptionId !== undefined && goal.alignsWithOptionId !== null && { alignsWithOptionId: goal.alignsWithOptionId }),
                ...(goal.sharedWithEmployeeIds !== undefined && { sharedWithEmployeeIds: goal.sharedWithEmployeeIds }),
                ...(goal.dueDate !== undefined && { dueDate: goal.dueDate }),
                ...(goal.completionDate !== undefined && goal.completionDate !== null && { completionDate: goal.completionDate }),
                ...(goal.lastChangedDateTime !== undefined && goal.lastChangedDateTime !== null && { lastChangedDateTime: goal.lastChangedDateTime }),
                ...(goal.status !== undefined && { status: goal.status }),
                ...(goal.milestones !== undefined && goal.milestones !== null && { milestones: goal.milestones }),
                ...(goal.actions !== undefined && goal.actions !== null && { actions: goal.actions })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
