import { z } from 'zod';
import { createAction } from 'nango';

const InputItemSchema = z.object({
    title: z.string().describe('Title of the subtask. Example: "Buy milk"'),
    startDate: z.string().optional().describe('Subtask start date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format. Example: "2026-10-09T09:00:00+0000"'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day subtask.'),
    sortOrder: z.number().optional().describe('Sort order value of the subtask.'),
    timeZone: z.string().optional().describe('IANA time zone the subtask start time is specified in. Example: "America/Los_Angeles"'),
    status: z.number().optional().describe('Completion status of the subtask: 0 (open) or 2 (completed).'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.')
});

const InputSchema = z
    .object({
        title: z.string().describe('Title of the task. Example: "Submit quarterly report"'),
        projectId: z.string().describe('ID of the project to create the task in. Example: "6226ff9877acee87727f6bca"'),
        content: z.string().optional().describe('Content (notes) of the task.'),
        desc: z.string().optional().describe('Description of the task checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task is an all-day task.'),
        startDate: z.string().optional().describe('Task start date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format. Example: "2026-10-09T09:00:00+0000"'),
        dueDate: z.string().optional().describe('Task due date and time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format. Example: "2026-10-10T09:00:00+0000"'),
        timeZone: z.string().optional().describe('IANA time zone the task times are specified in. Example: "America/Los_Angeles"'),
        reminders: z.array(z.string()).optional().describe('Reminders for the task. Example: ["TRIGGER:P0DT9H0M0S"]'),
        tags: z.array(z.string()).optional().describe('Tags to attach to the task. Example: ["work", "urgent"]'),
        repeatFlag: z.string().optional().describe('Recurrence rule for the task in RRULE format. Example: "RRULE:FREQ=DAILY;INTERVAL=1"'),
        priority: z.number().optional().describe('Task priority: 0 (none), 1 (low), 3 (medium), or 5 (high). Defaults to 0.'),
        sortOrder: z.number().optional().describe('Sort order value of the task.'),
        items: z.array(InputItemSchema).optional().describe('Subtasks (checklist items) to include in the task.')
    })
    .describe('Input parameters for creating a new TickTick task.');

const OutputItemSchema = z.object({
    id: z.string().optional().describe('Unique ID of the subtask.'),
    title: z.string().optional().describe('Title of the subtask.'),
    status: z.number().optional().describe('Completion status of the subtask: 0 (open) or 2 (completed).'),
    sortOrder: z.number().optional().describe('Sort order value of the subtask.'),
    startDate: z.string().optional().describe('Subtask start date and time.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day subtask.'),
    timeZone: z.string().optional().describe('IANA time zone of the subtask.'),
    completedTime: z.string().optional().describe('Subtask completion time.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the created task.'),
        projectId: z.string().describe('ID of the project the task belongs to.'),
        title: z.string().describe('Title of the task.'),
        content: z.string().optional().describe('Content (notes) of the task.'),
        desc: z.string().optional().describe('Description of the task checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task is an all-day task.'),
        startDate: z.string().optional().describe('Task start date and time.'),
        dueDate: z.string().optional().describe('Task due date and time.'),
        timeZone: z.string().optional().describe('IANA time zone of the task.'),
        reminders: z.array(z.string()).optional().describe('Reminders set on the task.'),
        tags: z.array(z.string()).optional().describe('Tags attached to the task.'),
        repeatFlag: z.string().optional().describe('Recurrence rule set on the task.'),
        priority: z.number().optional().describe('Task priority: 0 (none), 1 (low), 3 (medium), or 5 (high).'),
        status: z.number().optional().describe('Task status: 0 (open) or 2 (completed).'),
        completedTime: z.string().optional().describe('Task completion time.'),
        sortOrder: z.number().optional().describe('Sort order value of the task.'),
        items: z.array(OutputItemSchema).optional().describe('Subtasks (checklist items) of the task.'),
        kind: z.string().optional().describe('Task kind, for example "TEXT" or "CHECKLIST".'),
        etag: z.string().optional().describe('Entity tag identifying the task version.'),
        parentId: z.string().optional().describe('ID of the parent task when this task is a subtask.'),
        modifiedTime: z.string().optional().describe('Time the task was last modified.'),
        createdTime: z.string().optional().describe('Time the task was created.')
    })
    .describe('The newly created TickTick task, including its assigned ID.');

/**
 * @tags: [write]
 * @tagReason: Creates a new task in the specified project through the provider API.
 * @pitfalls: Each call creates a brand-new task with no dedup or upsert, so retrying a request that was actually processed creates duplicates; projectId must reference an existing project or the request fails; omitting timeZone makes the provider apply the account's default time zone.
 */
const action = createAction({
    description: 'Create a new task in a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ticktick.com/docs/openapi.md#create-task
            endpoint: '/open/v1/task',
            data: {
                title: input.title,
                projectId: input.projectId,
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
            },
            // Creating a task is not idempotent: a retried request would create a duplicate task.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
