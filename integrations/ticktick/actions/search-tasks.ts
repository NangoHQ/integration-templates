import { z } from 'zod';
import { createAction } from 'nango';

const ChecklistItemSchema = z
    .object({
        id: z.string().describe('Subtask identifier.'),
        title: z.string().describe('Subtask title.'),
        status: z.number().int().optional().describe('Subtask completion status: 0 = normal, 1 = completed.'),
        completedTime: z.string().optional().describe('Subtask completion time, e.g. "2019-11-13T03:00:00+0000".'),
        isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day item.'),
        sortOrder: z.number().optional().describe('Subtask sort order.'),
        startDate: z.string().optional().describe('Subtask start date-time, e.g. "2019-11-13T03:00:00+0000".'),
        timeZone: z.string().optional().describe('Subtask time zone, e.g. "America/Los_Angeles".')
    })
    .describe('A subtask (checklist item) belonging to a task.');

const FocusSummarySchema = z
    .object({
        pomoCount: z.number().int().optional().describe('Number of completed pomodoros.'),
        estimatedPomo: z.number().int().optional().describe('Estimated number of pomodoros.'),
        estimatedDuration: z.number().int().optional().describe('Estimated focus duration in seconds.'),
        pomoDuration: z.number().optional().describe('Focus duration in seconds.'),
        stopwatchDuration: z.number().optional().describe('Stopwatch duration in seconds.')
    })
    .describe('Focus (pomodoro) summary associated with a task.');

const TaskSchema = z
    .object({
        id: z.string().describe('Task identifier.'),
        projectId: z.string().describe('Identifier of the project the task belongs to.'),
        title: z.string().describe('Task title.'),
        content: z.string().optional().describe('Task content.'),
        desc: z.string().optional().describe('Description of the task checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task is an all-day item.'),
        startDate: z.string().optional().describe('Task start date-time, e.g. "2019-11-13T03:00:00+0000".'),
        dueDate: z.string().optional().describe('Task due date-time, e.g. "2019-11-14T03:00:00+0000".'),
        timeZone: z.string().optional().describe('Time zone the task times are specified in, e.g. "America/Los_Angeles".'),
        reminders: z.array(z.string()).optional().describe('Reminder triggers, e.g. "TRIGGER:P0DT9H0M0S".'),
        tags: z.array(z.string()).optional().describe('Tags attached to the task.'),
        repeatFlag: z.string().optional().describe('Recurrence rule, e.g. "RRULE:FREQ=DAILY;INTERVAL=1".'),
        repeatFrom: z
            .string()
            .optional()
            .describe('Recurrence calculation mode: "0" from the original due date, "1" from the completion date, "2" calendar-based.'),
        priority: z.number().int().optional().describe('Task priority: 0 = none, 1 = low, 3 = medium, 5 = high.'),
        status: z.number().int().optional().describe('Task status: -1 = abandoned, 0 = normal/open, 2 = completed.'),
        completedTime: z.string().optional().describe('Task completion time, e.g. "2019-11-13T03:00:00+0000".'),
        sortOrder: z.number().optional().describe('Task sort order.'),
        items: z.array(ChecklistItemSchema).optional().describe('Subtasks (checklist items) of the task.'),
        kind: z.string().optional().describe('Task kind: "TEXT", "NOTE", or "CHECKLIST".'),
        parentId: z.string().optional().describe('Parent task identifier when the task is a subtask.'),
        assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task.'),
        focusSummaries: z.array(FocusSummarySchema).optional().describe('Focus (pomodoro) summaries associated with the task.'),
        etag: z.string().optional().describe('Entity tag of the task.'),
        modifiedTime: z.string().optional().describe('Last modification time of the task.'),
        createdTime: z.string().optional().describe('Creation time of the task.')
    })
    .describe('A TickTick task.');

const InputSchema = z
    .object({
        keywords: z.string().describe('Text to search for. Must not be blank.'),
        projectIds: z.array(z.string()).optional().describe('Project IDs to restrict the search to. Omit to search across all projects.'),
        tags: z.array(z.string()).optional().describe('Tags to filter by. Returned tasks must contain all of the specified tags.'),
        status: z.array(z.number().int()).optional().describe('Task statuses to filter by: -1 = abandoned, 0 = normal/open, 2 = completed.'),
        dueFrom: z.string().optional().describe('Include tasks due on or after this date-time, e.g. "2026-07-01T00:00:00+0000".'),
        dueTo: z.string().optional().describe('Include tasks due on or before this date-time, e.g. "2026-07-31T23:59:59+0000".')
    })
    .describe('Criteria for searching tasks by keyword, with optional project, tag, status, and due-date filters.');

const OutputSchema = z
    .object({
        tasks: z.array(TaskSchema).describe('Tasks matching the search criteria.')
    })
    .describe('Tasks matching the search criteria.');

/**
 * @tags: [read]
 * @tagReason: Searches tasks with a read-only query and returns matching tasks; it does not create, update, or delete any provider data.
 * @pitfalls: Matching is case-insensitive and covers task content as well as titles, so results may include tasks whose title does not contain the keyword.
 */
const action = createAction({
    description: 'Search tasks by keyword, with optional project/tag/status/due-date filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.keywords.trim().length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'keywords must not be blank'
            });
        }

        const response = await nango.post<unknown>({
            // https://developer.ticktick.com/docs/openapi.md
            endpoint: '/open/v1/task/search',
            data: {
                keywords: input.keywords,
                ...(input.projectIds !== undefined && { projectIds: input.projectIds }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.dueFrom !== undefined && { dueFrom: input.dueFrom }),
                ...(input.dueTo !== undefined && { dueTo: input.dueTo })
            },
            retries: 3
        });

        const tasks = z.array(TaskSchema).parse(response.data);

        return {
            tasks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
