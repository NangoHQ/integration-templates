import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project that contains the task. Example: "6226ff9877acee87727f6bca"'),
        taskId: z.string().describe('Identifier of the task to remove the assignee from. Example: "63b7bebb91c0a5474805fcd4"')
    })
    .describe('Identifiers of the task whose assignee should be removed.');

const ChecklistItemSchema = z.object({
    id: z.string().optional().describe('Subtask identifier.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().optional().describe('Subtask completion status: 0 for normal, 1 for completed.'),
    completedTime: z.string().optional().describe('Subtask completion time.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask spans all day.'),
    sortOrder: z.number().optional().describe('Subtask sort order value.'),
    startDate: z.string().optional().describe('Subtask start date-time.'),
    timeZone: z.string().optional().describe('Time zone the subtask times are specified in.')
});

const FocusSummarySchema = z.object({
    pomoCount: z.number().optional().describe('Number of pomodoros recorded for the task.'),
    estimatedPomo: z.number().optional().describe('Estimated number of pomodoros for the task.'),
    estimatedDuration: z.number().optional().describe('Estimated focus duration in seconds.'),
    pomoDuration: z.number().optional().describe('Recorded focus duration in seconds.'),
    stopwatchDuration: z.number().optional().describe('Recorded stopwatch duration in seconds.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Task identifier.'),
        projectId: z.string().optional().describe('Identifier of the project the task belongs to.'),
        title: z.string().optional().describe('Task title.'),
        content: z.string().optional().describe('Task content.'),
        desc: z.string().optional().describe('Description of the task checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task spans all day.'),
        startDate: z.string().optional().describe('Task start date-time.'),
        dueDate: z.string().optional().describe('Task due date-time.'),
        timeZone: z.string().optional().describe('Time zone the task times are specified in.'),
        reminders: z.array(z.string()).optional().describe('Reminder triggers configured on the task.'),
        tags: z.array(z.string()).optional().describe('Tags attached to the task.'),
        repeatFlag: z.string().optional().describe('Recurrence rule of the task.'),
        repeatFrom: z
            .string()
            .optional()
            .describe('Recurrence calculation mode: 0 from the original date, 1 from the completion date, 2 from the next calendar occurrence.'),
        priority: z.number().optional().describe('Task priority: 0 none, 1 low, 3 medium, 5 high.'),
        status: z.number().optional().describe('Task status: -1 abandoned, 0 normal, 2 completed.'),
        completedTime: z.string().optional().describe('Task completion time, present once the task is completed.'),
        sortOrder: z.number().optional().describe('Task sort order value.'),
        parentId: z.string().optional().describe('Parent task identifier when the task is a subtask.'),
        assigneeUsername: z.string().optional().describe('Username of the assigned project member; omitted once the task has no assignee.'),
        kind: z.string().optional().describe('Task kind, for example TEXT, NOTE, or CHECKLIST.'),
        etag: z.string().optional().describe('Entity tag for the current task version.'),
        etimestamp: z.number().optional().describe('Entity timestamp for the task.'),
        modifiedTime: z.string().optional().describe('Task last-modified time.'),
        createdTime: z.string().optional().describe('Task creation time.'),
        columnId: z.string().optional().describe('Identifier of the kanban column the task belongs to.'),
        columnName: z.string().optional().describe('Name of the kanban column the task belongs to.'),
        isFloating: z.boolean().optional().describe('Whether the task floats without a fixed deadline.'),
        progress: z.number().optional().describe('Task progress value.'),
        items: z.array(ChecklistItemSchema).optional().describe('Checklist subtasks of the task.'),
        focusSummaries: z.array(FocusSummarySchema).optional().describe('Focus session summaries recorded for the task.')
    })
    .describe('The task returned after its assignee has been removed.');

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates the task by clearing its assignee assignment through a write endpoint.
 * @pitfalls: Unassigning a task ID that does not exist returns an empty success response instead of a not-found error, so the call fails rather than reporting a missing task; a task whose project was deleted returns a generic server error rather than not-found.
 */
const action = createAction({
    description: 'Remove the assignee from a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ticktick.com/docs/openapi.md#unassign-task
            endpoint: '/open/v1/task/unassign',
            data: {
                projectId: input.projectId,
                taskId: input.taskId
            },
            // Removing an assignee is idempotent: repeating the call leaves the task unassigned.
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
