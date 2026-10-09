import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('ID of the project that contains the task. Example: "6226ff9877acee87727f6bca"'),
        taskId: z.string().describe('ID of the task to mark as completed. Example: "63b7bebb91c0a5474805fcd4"')
    })
    .describe('Identifies the TickTick task to complete and then read back to confirm its final state.');

const ProviderChecklistItemSchema = z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    status: z.number().optional(),
    completedTime: z.string().nullable().optional(),
    isAllDay: z.boolean().optional(),
    sortOrder: z.number().optional(),
    startDate: z.string().nullable().optional(),
    timeZone: z.string().nullable().optional()
});

const ProviderFocusSummarySchema = z.object({
    pomoCount: z.number().optional(),
    estimatedPomo: z.number().optional(),
    estimatedDuration: z.number().optional(),
    pomoDuration: z.number().optional(),
    stopwatchDuration: z.number().optional()
});

const ProviderTaskSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string(),
    status: z.number(),
    completedTime: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    desc: z.string().nullable().optional(),
    isAllDay: z.boolean().optional(),
    priority: z.number().optional(),
    sortOrder: z.number().optional(),
    startDate: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    timeZone: z.string().nullable().optional(),
    reminders: z.array(z.string()).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    repeatFlag: z.string().nullable().optional(),
    repeatFrom: z.string().nullable().optional(),
    assigneeUsername: z.string().nullable().optional(),
    kind: z.string().nullable().optional(),
    parentId: z.string().nullable().optional(),
    items: z.array(ProviderChecklistItemSchema).nullable().optional(),
    focusSummaries: z.array(ProviderFocusSummarySchema).nullable().optional(),
    etag: z.string().nullable().optional(),
    modifiedTime: z.string().nullable().optional(),
    createdTime: z.string().nullable().optional()
});

const ChecklistItemSchema = z.object({
    id: z.string().optional().describe('Subtask identifier.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().optional().describe('Subtask completion status: 0 = normal, 1 = completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day item.'),
    sortOrder: z.number().optional().describe('Subtask sort order.'),
    startDate: z.string().optional().describe('Subtask start date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('Time zone in which the subtask start time is specified. Example: "America/Los_Angeles"')
});

const FocusSummarySchema = z.object({
    pomoCount: z.number().optional().describe('Number of pomodoros recorded for the task.'),
    estimatedPomo: z.number().optional().describe('Estimated number of pomodoros for the task.'),
    estimatedDuration: z.number().optional().describe('Estimated focus duration in seconds.'),
    pomoDuration: z.number().optional().describe('Pomodoro focus duration in seconds.'),
    stopwatchDuration: z.number().optional().describe('Stopwatch focus duration in seconds.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Task identifier.'),
        projectId: z.string().describe('ID of the project the task belongs to.'),
        title: z.string().describe('Task title.'),
        status: z.number().describe('Task status from the follow-up read: 2 (completed), or 0 when a recurring task advanced to its next open occurrence.'),
        completedTime: z.string().optional().describe('Task completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format; present when status is 2.'),
        advancedToNextOccurrence: z
            .boolean()
            .describe(
                'True when the task is recurring and the completion was confirmed by its dates moving to the next occurrence; the completed occurrence is stored by TickTick under a new task ID.'
            ),
        content: z.string().optional().describe('Task content.'),
        desc: z.string().optional().describe('Description of the task checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task is an all-day item.'),
        priority: z.number().optional().describe('Task priority: 0 = none, 1 = low, 3 = medium, 5 = high.'),
        sortOrder: z.number().optional().describe('Task sort order.'),
        startDate: z.string().optional().describe('Task start date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        dueDate: z.string().optional().describe('Task due date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        timeZone: z.string().optional().describe('Time zone in which the task times are specified. Example: "America/Los_Angeles"'),
        reminders: z.array(z.string()).optional().describe('Reminder triggers configured on the task. Example: ["TRIGGER:P0DT9H0M0S"]'),
        tags: z.array(z.string()).optional().describe('Tags attached to the task. Example: ["work", "urgent"]'),
        repeatFlag: z.string().optional().describe('Recurrence rule of the task. Example: "RRULE:FREQ=DAILY;INTERVAL=1"'),
        repeatFrom: z
            .string()
            .optional()
            .describe(
                'Recurrence calculation mode when repeatFlag is set: "0" from the original date, "1" from the completion date, "2" next applicable occurrence.'
            ),
        assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task.'),
        kind: z.string().optional().describe('Task kind: "TEXT", "NOTE" or "CHECKLIST".'),
        parentId: z.string().optional().describe('Parent task identifier when the task is a subtask.'),
        items: z.array(ChecklistItemSchema).optional().describe('Subtasks (checklist items) of the task.'),
        focusSummaries: z.array(FocusSummarySchema).optional().describe('Focus (pomodoro/stopwatch) summaries recorded for the task.'),
        etag: z.string().optional().describe('Provider entity tag for the task after completion.'),
        modifiedTime: z.string().optional().describe('Last modification time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        createdTime: z.string().optional().describe('Creation time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.')
    })
    .describe("The task's confirmed final state after it was marked completed.");

/**
 * @tags: [read, write]
 * @tagReason: Writes by marking the task complete, then reads the task back to return its confirmed final state.
 * @pitfalls: Completing a recurring task stores the completed occurrence under a new task ID and moves this task to its next open occurrence, so the result has status 0 and advancedToNextOccurrence true; completing an already-completed task succeeds and moves its completedTime to the time of the new call.
 */
const action = createAction({
    description:
        "COMPOSITE: mark a task as completed and return its confirmed final state in one call, instead of trusting the complete endpoint's empty 200 response.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write', 'tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const taskEndpoint = `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}`;

        // Read the task first: a recurring task stays open after completion, so its confirmation is
        // that the dates moved forward rather than that the status became 2.
        // https://developer.ticktick.com/docs/openapi.md#get-task-by-project-id-and-task-id
        const beforeResponse = await nango.get({
            endpoint: taskEndpoint,
            retries: 3
        });
        const before = ProviderTaskSchema.parse(beforeResponse.data);
        const isRecurring = Boolean(before.repeatFlag);

        // https://developer.ticktick.com/docs/openapi.md#completeusingpost
        await nango.post({
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}/complete`,
            // Completing a recurring task advances it to its next occurrence, so a retry after a lost
            // response would create an extra completed occurrence; this call must never be retried.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        // https://developer.ticktick.com/docs/openapi.md#get-task-by-project-id-and-task-id
        const response = await nango.get({
            endpoint: taskEndpoint,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'task_not_found',
                message: 'Task could not be read back after being marked complete.',
                projectId: input.projectId,
                taskId: input.taskId
            });
        }

        const task = ProviderTaskSchema.parse(response.data);
        const completedTime = task.completedTime;
        const isCompleted = task.status === 2 && Boolean(completedTime);
        const advancedToNextOccurrence =
            !isCompleted && isRecurring && task.status === 0 && (task.startDate !== before.startDate || task.dueDate !== before.dueDate);

        if (!isCompleted && !advancedToNextOccurrence) {
            throw new nango.ActionError({
                type: 'completion_not_confirmed',
                message: 'The follow-up read did not show the task as completed.',
                projectId: input.projectId,
                taskId: input.taskId,
                status: task.status,
                completedTime: completedTime ?? null
            });
        }

        return {
            id: task.id,
            projectId: task.projectId,
            title: task.title,
            status: task.status,
            advancedToNextOccurrence,
            ...(completedTime != null && { completedTime }),
            ...(task.content != null && { content: task.content }),
            ...(task.desc != null && { desc: task.desc }),
            ...(task.isAllDay != null && { isAllDay: task.isAllDay }),
            ...(task.priority != null && { priority: task.priority }),
            ...(task.sortOrder != null && { sortOrder: task.sortOrder }),
            ...(task.startDate != null && { startDate: task.startDate }),
            ...(task.dueDate != null && { dueDate: task.dueDate }),
            ...(task.timeZone != null && { timeZone: task.timeZone }),
            ...(task.reminders != null && { reminders: task.reminders }),
            ...(task.tags != null && { tags: task.tags }),
            ...(task.repeatFlag != null && { repeatFlag: task.repeatFlag }),
            ...(task.repeatFrom != null && { repeatFrom: task.repeatFrom }),
            ...(task.assigneeUsername != null && { assigneeUsername: task.assigneeUsername }),
            ...(task.kind != null && { kind: task.kind }),
            ...(task.parentId != null && { parentId: task.parentId }),
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
            }),
            ...(task.focusSummaries != null && {
                focusSummaries: task.focusSummaries.map((summary) => ({
                    ...(summary.pomoCount != null && { pomoCount: summary.pomoCount }),
                    ...(summary.estimatedPomo != null && { estimatedPomo: summary.estimatedPomo }),
                    ...(summary.estimatedDuration != null && { estimatedDuration: summary.estimatedDuration }),
                    ...(summary.pomoDuration != null && { pomoDuration: summary.pomoDuration }),
                    ...(summary.stopwatchDuration != null && { stopwatchDuration: summary.stopwatchDuration })
                }))
            }),
            ...(task.etag != null && { etag: task.etag }),
            ...(task.modifiedTime != null && { modifiedTime: task.modifiedTime }),
            ...(task.createdTime != null && { createdTime: task.createdTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
