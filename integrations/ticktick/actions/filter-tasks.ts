import { z } from 'zod';
import { createAction } from 'nango';

const ChecklistItemSchema = z.object({
    id: z.string().optional().describe('Unique subtask identifier.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().int().optional().describe('Subtask completion status: 0 normal, 1 completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day subtask.'),
    sortOrder: z.number().optional().describe('Subtask sort order value.'),
    startDate: z.string().optional().describe('Subtask start time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('IANA time zone the subtask times are specified in.')
});

const FocusSummarySchema = z.object({
    pomoCount: z.number().int().optional().describe('Number of completed pomodoros.'),
    estimatedPomo: z.number().int().optional().describe('Estimated number of pomodoros.'),
    estimatedDuration: z.number().int().optional().describe('Estimated focus duration in seconds.'),
    pomoDuration: z.number().optional().describe('Focus duration in seconds.'),
    stopwatchDuration: z.number().optional().describe('Stopwatch duration in seconds.')
});

const TaskSchema = z.object({
    id: z.string().describe('Unique task identifier.'),
    projectId: z.string().describe('Identifier of the project the task belongs to.'),
    title: z.string().describe('Task title.'),
    content: z.string().optional().describe('Task content (rich text or markdown).'),
    desc: z.string().optional().describe('Description shown for checklist tasks.'),
    isAllDay: z.boolean().optional().describe('Whether the task is an all-day task.'),
    startDate: z.string().optional().describe('Task start time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    dueDate: z.string().optional().describe('Task due time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('IANA time zone the task times are specified in.'),
    reminders: z.array(z.string()).optional().describe('Reminder triggers, e.g. "TRIGGER:PT0S".'),
    tags: z.array(z.string()).optional().describe('Tags assigned to the task.'),
    repeatFlag: z.string().optional().describe('Recurrence rule, e.g. "RRULE:FREQ=DAILY;INTERVAL=1".'),
    repeatFrom: z.string().optional().describe('Recurrence calculation mode: "0", "1", or "2".'),
    priority: z.number().int().optional().describe('Priority: 0 none, 1 low, 3 medium, 5 high.'),
    status: z.number().int().optional().describe('Status: -1 abandoned, 0 open, 2 completed.'),
    completedTime: z.string().optional().describe('Completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    sortOrder: z.number().optional().describe('Sort order value used for manual ordering.'),
    assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task.'),
    parentId: z.string().optional().describe('Parent task identifier when the task is a subtask.'),
    items: z.array(ChecklistItemSchema).optional().describe('Subtasks belonging to the task.'),
    focusSummaries: z.array(FocusSummarySchema).optional().describe('Focus (pomodoro) summaries for the task.'),
    kind: z.string().optional().describe('Task kind: "TEXT", "NOTE", or "CHECKLIST".'),
    etag: z.string().optional().describe('Entity tag identifying the task version.')
});

const InputSchema = z
    .object({
        projectIds: z.array(z.string()).optional().describe('Project IDs to restrict the search to. Omit to search across all projects in the account.'),
        startDate: z.string().optional().describe('Only return tasks whose own startDate is on or after this value, in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        endDate: z.string().optional().describe('Only return tasks whose own startDate is on or before this value, in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        priority: z.array(z.number().int()).optional().describe('Priority levels to include. Valid values: 0 (none), 1 (low), 3 (medium), 5 (high).'),
        tag: z.array(z.string()).optional().describe('Tags to include. A task is returned only when it contains all of the specified tags.'),
        kind: z.array(z.string()).optional().describe('Task kinds to include: "TEXT", "NOTE", or "CHECKLIST".'),
        status: z.array(z.number().int()).optional().describe('Statuses to include: -1 (abandoned), 0 (open), 2 (completed).')
    })
    .describe('Filters used to retrieve TickTick tasks. All fields are optional; omit projectIds to search across every project.');

const OutputSchema = z
    .object({
        tasks: z.array(TaskSchema).describe('Tasks matching the supplied filters, up to a maximum of 200.')
    })
    .describe('Tasks that matched the supplied filters.');

/**
 * @tags: [read]
 * @tagReason: Retrieves tasks matching the given filters without modifying any provider data.
 * @pitfalls: Results are capped at 200 tasks with no pagination, so they may be partial; startDate/endDate match each task's own startDate, so tasks lacking one are excluded when a range is supplied; tag returns only tasks containing all specified tags.
 */
const action = createAction({
    description:
        'Retrieve up to 200 tasks matching project, date, priority, tag, kind, and/or status filters - works across ALL projects when projectIds is omitted.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.projectIds !== undefined) {
            body['projectIds'] = input.projectIds;
        }
        if (input.startDate !== undefined) {
            body['startDate'] = input.startDate;
        }
        if (input.endDate !== undefined) {
            body['endDate'] = input.endDate;
        }
        if (input.priority !== undefined) {
            body['priority'] = input.priority;
        }
        if (input.tag !== undefined) {
            body['tag'] = input.tag;
        }
        if (input.kind !== undefined) {
            body['kind'] = input.kind;
        }
        if (input.status !== undefined) {
            body['status'] = input.status;
        }

        // https://developer.ticktick.com/docs/openapi.md#filter-tasks
        const response = await nango.post<unknown>({
            endpoint: '/open/v1/task/filter',
            data: body,
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
