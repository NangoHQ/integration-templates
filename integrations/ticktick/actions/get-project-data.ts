import { z } from 'zod';
import { createAction } from 'nango';

const ChecklistItemSchema = z.object({
    id: z.string().describe('Subtask identifier.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().optional().describe('Completion status of the subtask: 0 Normal, 1 Completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day subtask.'),
    sortOrder: z.number().optional().describe('Subtask sort order value.'),
    startDate: z.string().optional().describe('Subtask start time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('Subtask timezone, e.g. "America/Los_Angeles".')
});

const TaskSchema = z.object({
    id: z.string().describe('Task identifier.'),
    projectId: z.string().optional().describe('Identifier of the project the task belongs to.'),
    title: z.string().optional().describe('Task title.'),
    content: z.string().optional().describe('Task content/notes.'),
    desc: z.string().optional().describe('Description of the checklist.'),
    isAllDay: z.boolean().optional().describe('Whether the task is an all-day task.'),
    startDate: z.string().optional().describe('Task start time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    dueDate: z.string().optional().describe('Task due date in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    completedTime: z.string().optional().describe('Task completion time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('Task timezone, e.g. "America/Los_Angeles".'),
    repeatFlag: z.string().optional().describe('Recurrence rule, e.g. "RRULE:FREQ=DAILY;INTERVAL=1".'),
    repeatFrom: z.string().optional().describe('Recurrence calculation mode: 0 from original date, 1 from completion date, 2 default calendar recurrence.'),
    reminders: z.array(z.string()).optional().describe('List of reminder triggers, e.g. ["TRIGGER:PT0S"].'),
    tags: z.array(z.string()).optional().describe('Tags attached to the task.'),
    priority: z.number().optional().describe('Task priority: 0 None, 1 Low, 3 Medium, 5 High.'),
    status: z.number().optional().describe('Completion status: -1 Abandoned, 0 Normal, 2 Completed.'),
    sortOrder: z.number().optional().describe('Task sort order value.'),
    items: z.array(ChecklistItemSchema).optional().describe('Subtasks of the task.'),
    assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task.'),
    kind: z.string().optional().describe('Task kind: "TEXT", "NOTE", or "CHECKLIST".'),
    parentId: z.string().optional().describe('Parent task identifier when the task is a subtask.'),
    columnId: z.string().optional().describe('Identifier of the kanban column the task belongs to.'),
    columnName: z.string().optional().describe('Name of the kanban column the task belongs to.'),
    progress: z.number().optional().describe('Task progress value.'),
    isFloating: z.boolean().optional().describe('Whether the task floats without a fixed date.'),
    etag: z.string().optional().describe('Entity tag used by the provider for change detection.'),
    etimestamp: z.number().optional().describe('Epoch-millisecond timestamp associated with the entity tag.'),
    modifiedTime: z.string().optional().describe('Last modification time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.'),
    createdTime: z.string().optional().describe('Creation time in "yyyy-MM-dd\'T\'HH:mm:ssZ" format.')
});

const ProjectSchema = z.object({
    id: z.string().describe('Project identifier.'),
    name: z.string().optional().describe('Project name.'),
    color: z.string().optional().describe('Project color, e.g. "#F18181".'),
    sortOrder: z.number().optional().describe('Project sort order value.'),
    closed: z.boolean().optional().describe('Whether the project is closed.'),
    groupId: z.string().optional().describe('Identifier of the project group the project belongs to.'),
    viewMode: z.string().optional().describe('View mode: "list", "kanban", or "timeline".'),
    permission: z.string().optional().describe('Caller permission on the project: "read", "write", or "comment".'),
    kind: z.string().optional().describe('Project kind: "TASK" or "NOTE".')
});

const ColumnSchema = z.object({
    id: z.string().describe('Column identifier.'),
    projectId: z.string().optional().describe('Identifier of the project the column belongs to.'),
    name: z.string().optional().describe('Column name.'),
    sortOrder: z.number().optional().describe('Column sort order value.')
});

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project to fetch. Example: "6226ff9877acee87727f6bca".')
    })
    .describe('Identifies the project whose bundled data should be fetched.');

const OutputSchema = z
    .object({
        project: ProjectSchema.describe('The requested project.'),
        tasks: z.array(TaskSchema).describe("The project's undone tasks only; completed and abandoned tasks are excluded."),
        columns: z.array(ColumnSchema).describe('Kanban columns configured on the project.')
    })
    .describe('A project bundled with its undone tasks and kanban columns.');

/**
 * @tags: [read]
 * @tagReason: Fetches a project and its undone tasks and kanban columns; performs no provider mutations.
 * @pitfalls: The tasks array contains undone tasks only; completed and abandoned tasks that still belong to the project are never returned, so use a task-listing action to see them.
 */
const action = createAction({
    description: 'Get a project bundled with its undone tasks and kanban columns.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ticktick.com/docs/openapi.md - GET /open/v1/project/{projectId}/data
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/data`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
