import { z } from 'zod';
import { createAction } from 'nango';

const TaskItemSchema = z.object({
    id: z.string().optional().describe('Subtask ID.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().optional().describe('Subtask completion status: 0 = open, 2 = completed.'),
    startDate: z.string().optional().describe('Subtask start date-time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day task.'),
    timeZone: z.string().optional().describe('IANA time zone the subtask start time is specified in.'),
    completedTime: z.string().optional().describe('Subtask completion date-time, when completed.'),
    sortOrder: z.number().optional().describe('Subtask sort order.')
});

const TaskSchema = z.object({
    id: z.string().describe('Task ID.'),
    projectId: z.string().describe('ID of the project the task belongs to.'),
    title: z.string().describe('Task title.'),
    content: z.string().optional().describe('Task content/body.'),
    desc: z.string().optional().describe('Checklist description.'),
    isAllDay: z.boolean().optional().describe('Whether the task is an all-day task.'),
    startDate: z.string().optional().describe('Task start date-time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    dueDate: z.string().optional().describe('Task due date-time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('IANA time zone the task times are specified in.'),
    reminders: z.array(z.string()).optional().describe('Reminder triggers, e.g. "TRIGGER:PT0S".'),
    tags: z.array(z.string()).optional().describe('Tags attached to the task.'),
    repeatFlag: z.string().optional().describe('Recurrence rule, e.g. "RRULE:FREQ=DAILY;INTERVAL=1".'),
    priority: z.number().optional().describe('Task priority: 0 = none, 1 = low, 3 = medium, 5 = high.'),
    status: z.number().optional().describe('Task status: 0 = open, 2 = completed.'),
    completedTime: z.string().optional().describe('Completion date-time, when the task is completed.'),
    sortOrder: z.number().optional().describe('Task sort order.'),
    parentId: z.string().optional().describe('Parent task ID, when the task is a subtask.'),
    etag: z.string().optional().describe('Provider entity tag for the task.'),
    kind: z.string().optional().describe('Task kind, e.g. "TEXT" or "CHECKLIST".'),
    columnId: z.string().optional().describe('Kanban column ID, when the task is on a board.'),
    columnName: z.string().optional().describe('Kanban column name, when the task is on a board.'),
    items: z.array(TaskItemSchema).optional().describe('Checklist subtasks.'),
    modifiedTime: z.string().optional().describe('Last modification date-time.'),
    createdTime: z.string().optional().describe('Creation date-time.')
});

const InputSchema = z
    .object({
        startDate: z.string().describe('Start of the task startDate range (inclusive) in "yyyy-MM-dd\'T\'HH:mm:ssZ" format, e.g. "2026-07-01T00:00:00+0000".'),
        endDate: z.string().describe('End of the task startDate range (inclusive) in "yyyy-MM-dd\'T\'HH:mm:ssZ" format, e.g. "2026-07-14T23:59:59+0000".'),
        projectIds: z
            .array(z.string())
            .optional()
            .describe('Project IDs to search. Omit to search all accessible projects; use "inbox" for the inbox project.'),
        taskIds: z.array(z.string()).optional().describe('Restrict results to these task IDs.')
    })
    .describe('Criteria for listing undone tasks by startDate range.');

const OutputSchema = z
    .object({
        tasks: z.array(TaskSchema).describe('Undone tasks whose startDate falls within the requested range.')
    })
    .describe('Undone tasks matching the requested startDate range.');

/**
 * @tags: [read]
 * @tagReason: Queries the provider for undone tasks and performs no provider mutations.
 * @pitfalls: Filters on the task's startDate, so genuinely undone tasks without a startDate are excluded even when inside the range; ranges longer than 14 days are unsupported and may return no results; at most 200 tasks are returned.
 */
const action = createAction({
    description: 'List undone tasks whose startDate falls within a date range of up to 14 days.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ticktick.com/docs/openapi.md
            endpoint: '/open/v1/task/undone',
            data: {
                startDate: input.startDate,
                endDate: input.endDate,
                ...(input.projectIds !== undefined && { projectIds: input.projectIds }),
                ...(input.taskIds !== undefined && { taskIds: input.taskIds })
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
