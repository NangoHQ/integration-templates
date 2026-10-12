import { z } from 'zod';
import { createAction } from 'nango';

const ChecklistItemInputSchema = z.object({
    id: z.string().optional().describe('Identifier of an existing subtask to update. Omit to add a new subtask.'),
    title: z.string().optional().describe('Title of the subtask.'),
    status: z.number().optional().describe('Completion status of the subtask: 0 = normal, 1 = completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask spans the entire day.'),
    sortOrder: z.number().optional().describe('Sort order of the subtask.'),
    startDate: z.string().optional().describe('Subtask start date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('IANA time zone in which the subtask start time is specified.')
});

const ChecklistItemSchema = z.object({
    id: z.string().optional().describe('Subtask identifier.'),
    title: z.string().optional().describe('Title of the subtask.'),
    status: z.number().optional().describe('Completion status of the subtask: 0 = normal, 1 = completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask spans the entire day.'),
    sortOrder: z.number().optional().describe('Sort order of the subtask.'),
    startDate: z.string().optional().describe('Subtask start date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('IANA time zone in which the subtask start time is specified.')
});

const FocusSummarySchema = z.object({
    pomoCount: z.number().optional().describe('Number of completed pomodoros.'),
    estimatedPomo: z.number().optional().describe('Estimated number of pomodoros.'),
    estimatedDuration: z.number().optional().describe('Estimated focus duration in seconds.'),
    pomoDuration: z.number().optional().describe('Focus duration in seconds.'),
    stopwatchDuration: z.number().optional().describe('Stopwatch duration in seconds.')
});

const InputSchema = z
    .object({
        id: z.string().describe('Identifier of the task to update. Used as the task id in both the request path and body.'),
        projectId: z.string().describe("Identifier of the project that contains the task. Must match the task's actual project."),
        title: z.string().optional().describe('New task title.'),
        content: z.string().optional().describe('New task content (notes).'),
        desc: z.string().optional().describe('Description of the checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task is an all-day task.'),
        startDate: z.string().optional().describe('Start date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format. Example: "2019-11-13T03:00:00+0000".'),
        dueDate: z.string().optional().describe('Due date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format. Example: "2019-11-14T03:00:00+0000".'),
        timeZone: z.string().optional().describe('IANA time zone in which the start and due times are specified. Example: "America/Los_Angeles".'),
        reminders: z.array(z.string()).optional().describe('Reminder triggers, e.g. ["TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S"].'),
        tags: z.array(z.string()).optional().describe('Tags assigned to the task.'),
        repeatFlag: z.string().optional().describe('Recurrence rule in RRULE format. Example: "RRULE:FREQ=DAILY;INTERVAL=1".'),
        priority: z.number().optional().describe('Task priority: 0 = none, 1 = low, 3 = medium, 5 = high.'),
        sortOrder: z.number().optional().describe('Sort order of the task.'),
        items: z.array(ChecklistItemInputSchema).optional().describe('Subtasks (checklist items) of the task.')
    })
    .describe('Fields used to update an existing TickTick task. Only the fields to change need to be provided, along with the required id and projectId.');

const OutputSchema = z
    .object({
        id: z.string().describe('Task identifier.'),
        projectId: z.string().optional().describe('Identifier of the project that contains the task.'),
        title: z.string().optional().describe('Task title.'),
        content: z.string().optional().describe('Task content (notes).'),
        desc: z.string().optional().describe('Description of the checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task is an all-day task.'),
        startDate: z.string().optional().describe('Start date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        dueDate: z.string().optional().describe('Due date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        timeZone: z.string().optional().describe('IANA time zone in which the start and due times are specified.'),
        reminders: z.array(z.string()).optional().describe('Reminder triggers assigned to the task.'),
        tags: z.array(z.string()).optional().describe('Tags assigned to the task.'),
        repeatFlag: z.string().optional().describe('Recurrence rule in RRULE format.'),
        repeatFrom: z.string().optional().describe('Recurrence calculation mode: 0 = original schedule, 1 = completion date, 2 = calendar recurrence.'),
        priority: z.number().optional().describe('Task priority: 0 = none, 1 = low, 3 = medium, 5 = high.'),
        status: z.number().optional().describe('Task completion status: -1 = abandoned, 0 = normal, 2 = completed.'),
        completedTime: z.string().optional().describe('Task completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        sortOrder: z.number().optional().describe('Sort order of the task.'),
        items: z.array(ChecklistItemSchema).optional().describe('Subtasks (checklist items) of the task.'),
        assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task.'),
        kind: z.string().optional().describe('Task kind: "TEXT", "NOTE", or "CHECKLIST".'),
        parentId: z.string().optional().describe('Identifier of the parent task, when this task is a subtask.'),
        focusSummaries: z.array(FocusSummarySchema).optional().describe('Focus (pomodoro) summaries recorded for the task.'),
        etag: z.string().optional().describe('Entity tag of the task version.'),
        etimestamp: z.number().optional().describe('Entity timestamp of the task version.'),
        createdTime: z.string().optional().describe('Task creation time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        modifiedTime: z.string().optional().describe('Task last modification time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        columnId: z.string().optional().describe('Identifier of the kanban column the task belongs to.'),
        columnName: z.string().optional().describe('Name of the kanban column the task belongs to.'),
        progress: z.number().optional().describe('Task progress value.'),
        isFloating: z.boolean().optional().describe('Whether the task is a floating task without a fixed date.')
    })
    .describe('The updated TickTick task as returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Updates fields on an existing task through the provider API; the returned task comes from the write response, so no separate provider read is performed.
 * @pitfalls: This is a partial merge, so omitted fields keep their current values; if the task does not exist or does not belong to `projectId`, the provider returns 200 with an empty body and this action throws a `not_found` ActionError. The returned `startDate` may be normalized to equal `dueDate` for timed tasks regardless of the `startDate` sent.
 */
const action = createAction({
    description: "Update a task's fields, sending only the fields to change plus the required id and projectId.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            id: input.id,
            projectId: input.projectId,
            ...(input.title !== undefined && { title: input.title }),
            ...(input.content !== undefined && { content: input.content }),
            ...(input.desc !== undefined && { desc: input.desc }),
            ...(input.isAllDay !== undefined && { isAllDay: input.isAllDay }),
            ...(input.startDate !== undefined && { startDate: input.startDate }),
            ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
            ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
            ...(input.reminders !== undefined && { reminders: input.reminders }),
            ...(input.tags !== undefined && { tags: input.tags }),
            ...(input.repeatFlag !== undefined && { repeatFlag: input.repeatFlag }),
            ...(input.priority !== undefined && { priority: input.priority }),
            ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
            ...(input.items !== undefined && { items: input.items })
        };

        const response = await nango.post<unknown>({
            // https://developer.ticktick.com/docs/openapi.md#update-task
            endpoint: `/open/v1/task/${encodeURIComponent(input.id)}`,
            data,
            retries: 3
        });

        const task = response.data;

        if (task === undefined || task === null || task === '') {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Task "${input.id}" could not be updated. It may not exist or may not belong to project "${input.projectId}".`,
                id: input.id,
                projectId: input.projectId
            });
        }

        return OutputSchema.parse(task);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
