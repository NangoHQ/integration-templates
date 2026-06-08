import { createSync } from 'nango';
import { z } from 'zod';

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

const GoalSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    percentComplete: z.number().optional(),
    alignsWithOptionId: z.string().nullable().optional(),
    sharedWithEmployeeIds: z.array(z.number()).optional(),
    dueDate: z.string().optional(),
    completionDate: z.string().nullable().optional(),
    lastChangedDateTime: z.string().nullable().optional(),
    status: z.string().optional(),
    milestones: z.array(MilestoneSchema).nullable().optional()
});

const sync = createSync({
    description: 'Sync employee performance goals from BambooHR',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Goal: GoalSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/goals'
        }
    ],

    exec: async (nango) => {
        // Blocker: provider only exposes /v1/performance/employees/{employeeId}/goals
        // with no changed-since filter, no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('Goal');

        // https://documentation.bamboohr.com/reference/get-employees-directory
        const directoryResponse = await nango.get({
            endpoint: '/v1/employees/directory',
            headers: {
                accept: 'application/json'
            },
            retries: 3
        });

        const DirectorySchema = z.object({
            employees: z.array(
                z
                    .object({
                        id: z.union([z.string(), z.number()])
                    })
                    .passthrough()
            )
        });

        const directory = DirectorySchema.parse(directoryResponse.data);
        const employees = directory.employees;

        for (const employee of employees) {
            const employeeId = String(employee.id);

            // https://documentation.bamboohr.com/reference/list-goals
            const goalsResponse = await nango.get({
                endpoint: `/v1/performance/employees/${encodeURIComponent(employeeId)}/goals`,
                params: {
                    filter: 'status-all'
                },
                retries: 3
            });

            const GoalsListSchema = z.object({
                goals: z
                    .array(
                        z.object({
                            id: z.string(),
                            title: z.string(),
                            description: z.string().nullable().optional(),
                            percentComplete: z.number().optional(),
                            alignsWithOptionId: z.string().nullable().optional(),
                            sharedWithEmployeeIds: z.array(z.number()).optional(),
                            dueDate: z.string().optional(),
                            completionDate: z.string().nullable().optional(),
                            lastChangedDateTime: z.string().nullable().optional(),
                            status: z.string().optional(),
                            milestones: z.array(MilestoneSchema).nullable().optional()
                        })
                    )
                    .optional()
            });

            const goalsData = GoalsListSchema.parse(goalsResponse.data);
            const goals = goalsData.goals ?? [];

            const records = goals.map((goal) => ({
                id: goal.id,
                employeeId,
                title: goal.title,
                ...(goal.description !== undefined && goal.description !== null && { description: goal.description }),
                ...(goal.percentComplete !== undefined && { percentComplete: goal.percentComplete }),
                ...(goal.alignsWithOptionId !== undefined && goal.alignsWithOptionId !== null && { alignsWithOptionId: goal.alignsWithOptionId }),
                ...(goal.sharedWithEmployeeIds !== undefined && { sharedWithEmployeeIds: goal.sharedWithEmployeeIds }),
                ...(goal.dueDate !== undefined && { dueDate: goal.dueDate }),
                ...(goal.completionDate !== undefined && goal.completionDate !== null && { completionDate: goal.completionDate }),
                ...(goal.lastChangedDateTime !== undefined && goal.lastChangedDateTime !== null && { lastChangedDateTime: goal.lastChangedDateTime }),
                ...(goal.status !== undefined && { status: goal.status }),
                ...(goal.milestones !== undefined && goal.milestones !== null && { milestones: goal.milestones })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Goal');
            }
        }

        await nango.trackDeletesEnd('Goal');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
