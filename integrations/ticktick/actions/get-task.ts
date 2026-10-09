import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project that contains the task. Example: "6ac5b589bed7f77658a9a803"'),
        taskId: z.string().describe('Identifier of the task to retrieve. Example: "6ac94f5a8f089f376a258555"')
    })
    .describe('Input for retrieving a single task by its project ID and task ID.');

const ChecklistItemSchema = z.object({
    id: z.string().optional().describe('Subtask identifier.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().optional().describe('Subtask completion status: 0 = normal, 1 = completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day item.'),
    sortOrder: z.number().optional().describe('Subtask sort order value.'),
    startDate: z.string().optional().describe('Subtask start date-time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('IANA time zone the subtask times are specified in.')
});

const FocusSummarySchema = z.object({
    pomoCount: z.number().optional().describe('Number of completed pomodoros.'),
    estimatedPomo: z.number().optional().describe('Estimated number of pomodoros.'),
    estimatedDuration: z.number().optional().describe('Estimated focus duration in seconds.'),
    pomoDuration: z.number().optional().describe('Accumulated focus (pomodoro) duration in seconds.'),
    stopwatchDuration: z.number().optional().describe('Accumulated stopwatch duration in seconds.')
});

const OutputSchema = z
    .object({
        id: z.string().optional().describe('Task identifier.'),
        projectId: z.string().optional().describe('Identifier of the project the task belongs to.'),
        title: z.string().optional().describe('Task title.'),
        content: z.string().optional().describe('Task content (rich text body).'),
        desc: z.string().optional().describe('Description of the task checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task is an all-day task.'),
        isFloating: z.boolean().optional().describe('Whether the task floats without a fixed date.'),
        completedTime: z.string().optional().describe('Completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        dueDate: z.string().optional().describe('Due date-time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        startDate: z.string().optional().describe('Start date-time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        timeZone: z.string().optional().describe('IANA time zone the task times are specified in.'),
        repeatFlag: z.string().optional().describe('Recurrence rule (RFC 5545 RRULE); empty when the task does not repeat.'),
        repeatFrom: z.string().optional().describe('Recurrence calculation mode: "0", "1", or "2".'),
        reminders: z.array(z.string()).optional().describe('Reminder triggers, for example "TRIGGER:P0DT9H0M0S".'),
        tags: z.array(z.string()).optional().describe('Tags attached to the task.'),
        priority: z.number().optional().describe('Priority: 0 = none, 1 = low, 3 = medium, 5 = high.'),
        status: z.number().optional().describe('Completion status: -1 = abandoned, 0 = normal, 2 = completed.'),
        progress: z.number().optional().describe('Task progress percentage.'),
        sortOrder: z.number().optional().describe('Task sort order value.'),
        kind: z.string().optional().describe('Task kind: "TEXT", "NOTE", or "CHECKLIST".'),
        parentId: z.string().optional().describe('Parent task identifier when this task is a subtask; empty string when it has no parent.'),
        assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task.'),
        columnId: z.string().optional().describe('Kanban column identifier the task belongs to.'),
        columnName: z.string().optional().describe('Kanban column name the task belongs to.'),
        etag: z.string().optional().describe('Entity tag used for optimistic concurrency.'),
        etimestamp: z.number().optional().describe('Epoch-millisecond timestamp of the current entity tag.'),
        createdTime: z.string().optional().describe('Creation time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        modifiedTime: z.string().optional().describe('Last modification time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
        items: z.array(ChecklistItemSchema).optional().describe('Subtasks (checklist items) of the task.'),
        focusSummaries: z.array(FocusSummarySchema).optional().describe('Focus (pomodoro) summaries attached to the task.')
    })
    .describe('A single TickTick task with its subtasks, focus summaries, and metadata.');

const ErrorStatusSchema = z.object({
    status: z.number().optional(),
    statusCode: z.number().optional(),
    response: z.object({ status: z.number().optional() }).optional()
});

// Proxy errors carry the provider status either on the error itself or on its response, depending on the runtime.
function isNotFoundError(error: unknown): boolean {
    const parsed = ErrorStatusSchema.safeParse(error);
    if (!parsed.success) {
        return false;
    }
    const { status, statusCode, response } = parsed.data;
    return status === 404 || statusCode === 404 || response?.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Reads a single task from the provider without modifying any provider state.
 * @pitfalls: If the task was deleted, this action can still return the full stale task as a successful result instead of a not-found error, so a successful read is not proof the task still exists; if the task's parent project was deleted, the action fails with an unknown-exception error rather than a clean not-found.
 */
const action = createAction({
    description: 'Retrieve a single task by its project ID and task ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch - a provider 404 is an expected outcome that is surfaced as a structured ActionError
        try {
            const response = await nango.get({
                // https://developer.ticktick.com/docs/openapi.md#get-task-by-project-id-and-task-id
                endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}`,
                retries: 3
            });

            return OutputSchema.parse(response.data);
        } catch (error: unknown) {
            if (isNotFoundError(error)) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Task not found',
                    projectId: input.projectId,
                    taskId: input.taskId
                });
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
