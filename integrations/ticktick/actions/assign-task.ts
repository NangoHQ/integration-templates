import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project that contains the task. Example: "6226ff9877acee87727f6bca".'),
        taskId: z.string().describe('Identifier of the task to assign. Example: "63b7bebb91c0a5474805fcd4".'),
        assigneeUsername: z.string().describe('Username of an existing member of the task\'s project to assign the task to. Example: "member@example.com".')
    })
    .describe('Identifies the task to assign and the project member that should be assigned to it.');

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

const ProviderFocusSummarySchema = z.object({
    pomoCount: z.number().nullish(),
    estimatedPomo: z.number().nullish(),
    estimatedDuration: z.number().nullish(),
    pomoDuration: z.number().nullish(),
    stopwatchDuration: z.number().nullish()
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    projectId: z.string(),
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
    sortOrder: z.number().nullish(),
    status: z.number().nullish(),
    assigneeUsername: z.string().nullish(),
    kind: z.string().nullish(),
    parentId: z.string().nullish(),
    items: z.array(ProviderChecklistItemSchema).nullish(),
    focusSummaries: z.array(ProviderFocusSummarySchema).nullish(),
    etag: z.string().nullish()
});

const ChecklistItemSchema = z.object({
    id: z.string().optional().describe('Subtask identifier.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().optional().describe('Subtask completion status: 0 = normal, 1 = completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day item.'),
    sortOrder: z.number().optional().describe('Subtask sort order.'),
    startDate: z.string().optional().describe('Subtask start date/time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('Subtask time zone. Example: "America/Los_Angeles".')
});

const FocusSummarySchema = z.object({
    pomoCount: z.number().optional().describe('Number of completed pomodoros.'),
    estimatedPomo: z.number().optional().describe('Estimated number of pomodoros.'),
    estimatedDuration: z.number().optional().describe('Estimated focus duration in seconds.'),
    pomoDuration: z.number().optional().describe('Focus duration in seconds.'),
    stopwatchDuration: z.number().optional().describe('Stopwatch duration in seconds.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Task identifier.'),
        projectId: z.string().describe('Identifier of the project that contains the task.'),
        title: z.string().optional().describe('Task title.'),
        content: z.string().optional().describe('Task content/notes.'),
        desc: z.string().optional().describe('Description of the task checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task is an all-day item.'),
        startDate: z.string().optional().describe('Task start date/time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        dueDate: z.string().optional().describe('Task due date/time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        completedTime: z.string().optional().describe('Task completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        timeZone: z.string().optional().describe('Task time zone. Example: "America/Los_Angeles".'),
        reminders: z.array(z.string()).optional().describe('Reminder triggers attached to the task. Example: ["TRIGGER:PT0S"].'),
        tags: z.array(z.string()).optional().describe('Tags attached to the task.'),
        repeatFlag: z.string().optional().describe('Recurrence rule for the task. Example: "RRULE:FREQ=DAILY;INTERVAL=1".'),
        priority: z.number().optional().describe('Task priority: 0 = none, 1 = low, 3 = medium, 5 = high.'),
        sortOrder: z.number().optional().describe('Task sort order.'),
        status: z.number().optional().describe('Task status: -1 = abandoned, 0 = normal, 2 = completed.'),
        assigneeUsername: z.string().optional().describe('Username of the project member currently assigned to the task.'),
        kind: z.string().optional().describe('Task kind: "TEXT", "NOTE", or "CHECKLIST".'),
        parentId: z.string().optional().describe('Identifier of the parent task when this task is a subtask.'),
        items: z.array(ChecklistItemSchema).optional().describe('Checklist subtasks of the task.'),
        focusSummaries: z.array(FocusSummarySchema).optional().describe('Focus (pomodoro/stopwatch) summaries for the task.'),
        etag: z.string().optional().describe('Entity tag of the task revision after assignment.')
    })
    .describe('The task after assignment, including its current assigneeUsername.');

function toChecklistItem(item: z.infer<typeof ProviderChecklistItemSchema>): z.infer<typeof ChecklistItemSchema> {
    return {
        ...(item.id != null && { id: item.id }),
        ...(item.title != null && { title: item.title }),
        ...(item.status != null && { status: item.status }),
        ...(item.completedTime != null && { completedTime: item.completedTime }),
        ...(item.isAllDay != null && { isAllDay: item.isAllDay }),
        ...(item.sortOrder != null && { sortOrder: item.sortOrder }),
        ...(item.startDate != null && { startDate: item.startDate }),
        ...(item.timeZone != null && { timeZone: item.timeZone })
    };
}

function toFocusSummary(summary: z.infer<typeof ProviderFocusSummarySchema>): z.infer<typeof FocusSummarySchema> {
    return {
        ...(summary.pomoCount != null && { pomoCount: summary.pomoCount }),
        ...(summary.estimatedPomo != null && { estimatedPomo: summary.estimatedPomo }),
        ...(summary.estimatedDuration != null && { estimatedDuration: summary.estimatedDuration }),
        ...(summary.pomoDuration != null && { pomoDuration: summary.pomoDuration }),
        ...(summary.stopwatchDuration != null && { stopwatchDuration: summary.stopwatchDuration })
    };
}

/**
 * @tags: [write]
 * @tagReason: Assigns a project member to a task, mutating the task's assignee on the provider.
 * @pitfalls: The task is assigned only when assigneeUsername exactly matches a username of an existing member of the task's project, so callers should resolve the username from the project's member list first.
 */
const action = createAction({
    description: 'Assign a task to a member of its project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Assign Task)
        const response = await nango.post({
            endpoint: '/open/v1/task/assign',
            data: {
                projectId: input.projectId,
                taskId: input.taskId,
                assigneeUsername: input.assigneeUsername
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Task not found or assignment was not applied.',
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
            ...(task.isAllDay != null && { isAllDay: task.isAllDay }),
            ...(task.startDate != null && { startDate: task.startDate }),
            ...(task.dueDate != null && { dueDate: task.dueDate }),
            ...(task.completedTime != null && { completedTime: task.completedTime }),
            ...(task.timeZone != null && { timeZone: task.timeZone }),
            ...(task.reminders != null && { reminders: task.reminders }),
            ...(task.tags != null && { tags: task.tags }),
            ...(task.repeatFlag != null && { repeatFlag: task.repeatFlag }),
            ...(task.priority != null && { priority: task.priority }),
            ...(task.sortOrder != null && { sortOrder: task.sortOrder }),
            ...(task.status != null && { status: task.status }),
            ...(task.assigneeUsername != null && { assigneeUsername: task.assigneeUsername }),
            ...(task.kind != null && { kind: task.kind }),
            ...(task.parentId != null && { parentId: task.parentId }),
            ...(task.items != null && { items: task.items.map(toChecklistItem) }),
            ...(task.focusSummaries != null && { focusSummaries: task.focusSummaries.map(toFocusSummary) }),
            ...(task.etag != null && { etag: task.etag })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
