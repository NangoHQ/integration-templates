import { z } from 'zod';
import { createAction } from 'nango';

const ChecklistItemSchema = z
    .object({
        id: z.string().optional().describe('Identifier of the subtask.'),
        title: z.string().optional().describe('Title of the subtask.'),
        status: z.number().optional().describe('Completion status of the subtask: 0 normal, 1 completed.'),
        completedTime: z.string().optional().describe('Completion time of the subtask in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        isAllDay: z.boolean().optional().describe('Whether the subtask spans the whole day.'),
        sortOrder: z.number().optional().describe('Sort order value of the subtask.'),
        startDate: z.string().optional().describe('Start date/time of the subtask in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        timeZone: z.string().optional().describe('Time zone of the subtask.')
    })
    .describe('A checklist item (subtask) belonging to a task.');

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project that contains the task. Example: "6ac5b589bed7f77658a9a803".'),
        taskId: z.string().describe('Identifier of the task to mark as completed. Example: "6ac5b589bed7f77658a9a80a".')
    })
    .describe('Identifiers of the task to mark as completed.');

const OutputSchema = z
    .object({
        id: z.string().describe('Task identifier.'),
        projectId: z.string().describe('Identifier of the project that contains the task.'),
        title: z.string().optional().describe('Task title.'),
        content: z.string().optional().describe('Task content or notes.'),
        desc: z.string().optional().describe('Description of the task checklist.'),
        status: z.number().optional().describe('Completion status of the task: -1 abandoned, 0 normal, 2 completed.'),
        completedTime: z.string().optional().describe('Completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format; present once the task is completed.'),
        startDate: z.string().optional().describe('Start date/time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        dueDate: z.string().optional().describe('Due date/time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        isAllDay: z.boolean().optional().describe('Whether the task spans the whole day.'),
        priority: z.number().optional().describe('Task priority: 0 none, 1 low, 3 medium, 5 high.'),
        tags: z.array(z.string()).optional().describe('Tags attached to the task.'),
        reminders: z.array(z.string()).optional().describe('Reminder triggers configured on the task.'),
        repeatFlag: z.string().optional().describe('Recurrence rule (RRULE) of the task, if any.'),
        timeZone: z.string().optional().describe('Time zone of the task.'),
        kind: z.string().optional().describe('Task kind, e.g. TEXT, NOTE, or CHECKLIST.'),
        parentId: z.string().optional().describe('Identifier of the parent task, if this task is a subtask.'),
        assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task, if any.'),
        sortOrder: z.number().optional().describe('Sort order value of the task.'),
        modifiedTime: z.string().optional().describe('Last modification time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        createdTime: z.string().optional().describe('Creation time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        items: z.array(ChecklistItemSchema).optional().describe('Subtasks (checklist items) of the task.')
    })
    .describe('The task as returned by the provider immediately after it was marked completed.');

const ProviderTaskSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string().nullish(),
    content: z.string().nullish(),
    desc: z.string().nullish(),
    status: z.number().nullish(),
    completedTime: z.string().nullish(),
    startDate: z.string().nullish(),
    dueDate: z.string().nullish(),
    isAllDay: z.boolean().nullish(),
    priority: z.number().nullish(),
    tags: z.array(z.string()).nullish(),
    reminders: z.array(z.string()).nullish(),
    repeatFlag: z.string().nullish(),
    timeZone: z.string().nullish(),
    kind: z.string().nullish(),
    parentId: z.string().nullish(),
    assigneeUsername: z.string().nullish(),
    sortOrder: z.number().nullish(),
    modifiedTime: z.string().nullish(),
    createdTime: z.string().nullish(),
    items: z
        .array(
            z.object({
                id: z.string().nullish(),
                title: z.string().nullish(),
                status: z.number().nullish(),
                completedTime: z.string().nullish(),
                isAllDay: z.boolean().nullish(),
                sortOrder: z.number().nullish(),
                startDate: z.string().nullish(),
                timeZone: z.string().nullish()
            })
        )
        .nullish()
});

/**
 * @tags: [write]
 * @tagReason: Marks a task as completed, mutating its status and completion time on the provider.
 * @pitfalls: Completing a task that is already completed still succeeds and updates its completedTime to the time of the new call.
 */
const action = createAction({
    description: 'Mark a single task as completed.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read', 'tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Complete Task)
        // Setting a task to completed is idempotent (repeating it leaves the task in the same completed state).
        await nango.post({
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}/complete`,
            retries: 3
        });

        // https://developer.ticktick.com/docs/openapi.md (Get Task)
        const response = await nango.get({
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task could not be read back after completion.',
                projectId: input.projectId,
                taskId: input.taskId
            });
        }

        const task = ProviderTaskSchema.parse(response.data);

        return {
            id: task.id,
            projectId: task.projectId,
            ...(task.title != null && { title: task.title }),
            ...(task.content != null && { content: task.content }),
            ...(task.desc != null && { desc: task.desc }),
            ...(task.status != null && { status: task.status }),
            ...(task.completedTime != null && { completedTime: task.completedTime }),
            ...(task.startDate != null && { startDate: task.startDate }),
            ...(task.dueDate != null && { dueDate: task.dueDate }),
            ...(task.isAllDay != null && { isAllDay: task.isAllDay }),
            ...(task.priority != null && { priority: task.priority }),
            ...(task.tags != null && { tags: task.tags }),
            ...(task.reminders != null && { reminders: task.reminders }),
            ...(task.repeatFlag != null && { repeatFlag: task.repeatFlag }),
            ...(task.timeZone != null && { timeZone: task.timeZone }),
            ...(task.kind != null && { kind: task.kind }),
            ...(task.parentId != null && { parentId: task.parentId }),
            ...(task.assigneeUsername != null && { assigneeUsername: task.assigneeUsername }),
            ...(task.sortOrder != null && { sortOrder: task.sortOrder }),
            ...(task.modifiedTime != null && { modifiedTime: task.modifiedTime }),
            ...(task.createdTime != null && { createdTime: task.createdTime }),
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
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
