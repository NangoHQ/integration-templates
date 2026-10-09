import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectIds: z
            .array(z.string())
            .optional()
            .describe('Restrict results to these project IDs. Omit to search all accessible projects. Example: ["6226ff9877acee87727f6bca"]'),
        startDate: z.string().optional().describe('Inclusive lower bound for the task completedTime. Example: "2026-01-01T00:00:00+0000"'),
        endDate: z.string().optional().describe('Inclusive upper bound for the task completedTime. Example: "2026-12-31T23:59:59+0000"')
    })
    .describe('Optional filters narrowing the set of completed tasks returned.');

const ChecklistItemSchema = z.object({
    id: z.string().optional().describe('Subtask identifier.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().optional().describe('Subtask completion status: 0 normal, 1 completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is all-day.'),
    sortOrder: z.number().optional().describe('Subtask sort order.'),
    startDate: z.string().optional().describe('Subtask start time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('Subtask time zone. Example: "America/Los_Angeles"')
});

const TaskSchema = z.object({
    id: z.string().describe('Task identifier.'),
    projectId: z.string().optional().describe('Identifier of the project the task belongs to.'),
    title: z.string().optional().describe('Task title.'),
    content: z.string().optional().describe('Task content.'),
    desc: z.string().optional().describe('Description of the task checklist.'),
    isAllDay: z.boolean().optional().describe('Whether the task is all-day.'),
    startDate: z.string().optional().describe('Task start time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    dueDate: z.string().optional().describe('Task due time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    completedTime: z.string().optional().describe('Task completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('Task time zone. Example: "America/Los_Angeles"'),
    reminders: z.array(z.string()).optional().describe('Reminder triggers. Example: ["TRIGGER:PT0S"]'),
    tags: z.array(z.string()).optional().describe('Tags attached to the task. Example: ["work", "urgent"]'),
    repeatFlag: z.string().optional().describe('Recurrence rule. Example: "RRULE:FREQ=DAILY;INTERVAL=1"'),
    priority: z.number().optional().describe('Task priority: 0 none, 1 low, 3 medium, 5 high.'),
    status: z.number().optional().describe('Task status: -1 abandoned, 0 normal, 2 completed.'),
    sortOrder: z.number().optional().describe('Task sort order.'),
    parentId: z.string().optional().describe('Parent task identifier, when the task is a subtask.'),
    assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task.'),
    kind: z.string().optional().describe('Task kind: "TEXT", "NOTE", or "CHECKLIST".'),
    etag: z.string().optional().describe('Entity tag for the task, used for concurrency control.'),
    createdTime: z.string().optional().describe('Task creation time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    modifiedTime: z.string().optional().describe('Task last modification time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    items: z.array(ChecklistItemSchema).optional().describe('Subtasks of the task.')
});

const OutputSchema = z
    .object({
        tasks: z.array(TaskSchema).describe('Completed tasks matching the filters, up to 200 results.')
    })
    .describe('Completed tasks matching the supplied filters.');

const ProviderChecklistItemSchema = z.object({
    id: z.string().nullish(),
    title: z.string().nullish(),
    status: z.number().nullish(),
    completedTime: z.string().nullish(),
    isAllDay: z.boolean().nullish(),
    sortOrder: z.number().nullish(),
    startDate: z.string().nullish(),
    timeZone: z.string().nullish()
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    projectId: z.string().nullish(),
    title: z.string().nullish(),
    content: z.string().nullish(),
    desc: z.string().nullish(),
    isAllDay: z.boolean().nullish(),
    startDate: z.string().nullish(),
    dueDate: z.string().nullish(),
    completedTime: z.string().nullish(),
    timeZone: z.string().nullish(),
    reminders: z.array(z.string()).nullish(),
    tags: z.array(z.string()).nullish(),
    repeatFlag: z.string().nullish(),
    priority: z.number().nullish(),
    status: z.number().nullish(),
    sortOrder: z.number().nullish(),
    parentId: z.string().nullish(),
    assigneeUsername: z.string().nullish(),
    kind: z.string().nullish(),
    etag: z.string().nullish(),
    createdTime: z.string().nullish(),
    modifiedTime: z.string().nullish(),
    items: z.array(ProviderChecklistItemSchema).nullish()
});

const ProviderResponseSchema = z.array(ProviderTaskSchema);

/**
 * @tags: [read]
 * @tagReason: Lists completed tasks from the provider without modifying any provider data.
 * @pitfalls: Results are capped at 200 tasks with no pagination, so matches beyond that are silently omitted; startDate/endDate filter on completedTime (not a task's start or due date), and every filter is optional so omitting them can return a broad, unexpected set.
 */
const action = createAction({
    description: 'List up to 200 tasks completed within a time range, optionally scoped to specific projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Task > List Completed Tasks)
        const response = await nango.post({
            endpoint: '/open/v1/task/completed',
            data: {
                ...(input.projectIds !== undefined && { projectIds: input.projectIds }),
                ...(input.startDate !== undefined && { startDate: input.startDate }),
                ...(input.endDate !== undefined && { endDate: input.endDate })
            },
            retries: 3
        });

        const tasks = ProviderResponseSchema.parse(response.data);

        return {
            tasks: tasks.map((task) => ({
                id: task.id,
                ...(task.projectId != null && { projectId: task.projectId }),
                ...(task.title != null && { title: task.title }),
                ...(task.content != null && { content: task.content }),
                ...(task.desc != null && { desc: task.desc }),
                ...(task.isAllDay != null && { isAllDay: task.isAllDay }),
                ...(task.startDate != null && { startDate: task.startDate }),
                ...(task.dueDate != null && { dueDate: task.dueDate }),
                ...(task.completedTime != null && { completedTime: task.completedTime }),
                ...(task.timeZone != null && { timeZone: task.timeZone }),
                ...(task.reminders != null && { reminders: task.reminders }),
                ...(task.tags != null && { tags: task.tags }),
                ...(task.repeatFlag != null && { repeatFlag: task.repeatFlag }),
                ...(task.priority != null && { priority: task.priority }),
                ...(task.status != null && { status: task.status }),
                ...(task.sortOrder != null && { sortOrder: task.sortOrder }),
                ...(task.parentId != null && { parentId: task.parentId }),
                ...(task.assigneeUsername != null && { assigneeUsername: task.assigneeUsername }),
                ...(task.kind != null && { kind: task.kind }),
                ...(task.etag != null && { etag: task.etag }),
                ...(task.createdTime != null && { createdTime: task.createdTime }),
                ...(task.modifiedTime != null && { modifiedTime: task.modifiedTime }),
                ...(task.items != null && {
                    items: task.items.map((item) => ({
                        ...(item.id != null && { id: item.id }),
                        ...(item.title != null && { title: item.title }),
                        ...(item.status != null && { status: item.status }),
                        ...(item.completedTime != null && { completedTime: item.completedTime }),
                        ...(item.isAllDay != null && { isAllDay: item.isAllDay }),
                        ...(item.sortOrder != null && { sortOrder: item.sortOrder }),
                        ...(item.startDate != null && { startDate: item.startDate }),
                        ...(item.timeZone != null && { timeZone: item.timeZone })
                    }))
                })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
