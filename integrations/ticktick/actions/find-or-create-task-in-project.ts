import { z } from 'zod';
import { createAction } from 'nango';

const InputChecklistItemSchema = z.object({
    title: z.string().describe('Title of the subtask.'),
    startDate: z.string().optional().describe('Subtask start date/time in "yyyy-MM-ddTHH:mm:ssZ" format, e.g. "2026-10-20T10:00:00+0000".'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day item.'),
    sortOrder: z.number().int().optional().describe('Sort order of the subtask.'),
    timeZone: z.string().optional().describe('IANA time zone for the subtask start time, e.g. "America/Los_Angeles".'),
    status: z.number().int().optional().describe('Subtask completion status: 0 normal, 1 completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-ddTHH:mm:ssZ" format.')
});

const InputSchema = z
    .object({
        projectName: z
            .string()
            .min(1)
            .describe('Name of the project to create the task in. Matched case-sensitively against existing projects; created when no exact match exists.'),
        title: z.string().describe('Title of the task to create.'),
        content: z.string().optional().describe('Task content/notes.'),
        desc: z.string().optional().describe('Description of the task checklist.'),
        isAllDay: z.boolean().optional().describe('Whether the task is an all-day item.'),
        startDate: z.string().optional().describe('Task start date/time in "yyyy-MM-ddTHH:mm:ssZ" format, e.g. "2026-10-20T10:00:00+0000".'),
        dueDate: z.string().optional().describe('Task due date/time in "yyyy-MM-ddTHH:mm:ssZ" format, e.g. "2026-10-20T10:00:00+0000".'),
        timeZone: z.string().optional().describe('IANA time zone for the task dates, e.g. "America/Los_Angeles".'),
        reminders: z.array(z.string()).optional().describe('Reminder triggers, e.g. ["TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S"].'),
        tags: z.array(z.string()).optional().describe('Tags to attach to the task, e.g. ["work", "urgent"].'),
        repeatFlag: z.string().optional().describe('Recurrence rule, e.g. "RRULE:FREQ=DAILY;INTERVAL=1".'),
        priority: z.number().int().optional().describe('Task priority: 0 none, 1 low, 3 medium, 5 high.'),
        sortOrder: z.number().int().optional().describe('Sort order of the task.'),
        items: z.array(InputChecklistItemSchema).optional().describe('Subtasks (checklist items) to create with the task.')
    })
    .describe('Input for creating a task inside a project identified by name, creating the project first if no project with that name exists.');

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullish(),
    sortOrder: z.number().nullish(),
    closed: z.boolean().nullish(),
    groupId: z.string().nullish(),
    viewMode: z.string().nullish(),
    permission: z.string().nullish(),
    kind: z.string().nullish()
});

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

const ProviderTaskSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string(),
    sortOrder: z.number().nullish(),
    content: z.string().nullish(),
    desc: z.string().nullish(),
    startDate: z.string().nullish(),
    dueDate: z.string().nullish(),
    timeZone: z.string().nullish(),
    isAllDay: z.boolean().nullish(),
    reminders: z.array(z.string()).nullish(),
    tags: z.array(z.string()).nullish(),
    repeatFlag: z.string().nullish(),
    priority: z.number().nullish(),
    status: z.number().nullish(),
    completedTime: z.string().nullish(),
    items: z.array(ProviderChecklistItemSchema).nullish(),
    assigneeUsername: z.string().nullish(),
    kind: z.string().nullish(),
    parentId: z.string().nullish(),
    etag: z.string().nullish(),
    createdTime: z.string().nullish(),
    modifiedTime: z.string().nullish()
});

const OutputChecklistItemSchema = z.object({
    id: z.string().optional().describe('Subtask identifier.'),
    title: z.string().optional().describe('Subtask title.'),
    status: z.number().optional().describe('Subtask completion status: 0 normal, 1 completed.'),
    completedTime: z.string().optional().describe('Subtask completion time in "yyyy-MM-ddTHH:mm:ssZ" format.'),
    isAllDay: z.boolean().optional().describe('Whether the subtask is an all-day item.'),
    sortOrder: z.number().optional().describe('Sort order of the subtask.'),
    startDate: z.string().optional().describe('Subtask start date/time in "yyyy-MM-ddTHH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('IANA time zone for the subtask start time.')
});

const OutputTaskSchema = z.object({
    id: z.string().describe('Task identifier.'),
    projectId: z.string().describe('ID of the project the task belongs to.'),
    title: z.string().describe('Task title.'),
    sortOrder: z.number().optional().describe('Sort order of the task.'),
    content: z.string().optional().describe('Task content/notes.'),
    desc: z.string().optional().describe('Description of the task checklist.'),
    startDate: z.string().optional().describe('Task start date/time in "yyyy-MM-ddTHH:mm:ssZ" format.'),
    dueDate: z.string().optional().describe('Task due date/time in "yyyy-MM-ddTHH:mm:ssZ" format.'),
    timeZone: z.string().optional().describe('IANA time zone for the task dates.'),
    isAllDay: z.boolean().optional().describe('Whether the task is an all-day item.'),
    reminders: z.array(z.string()).optional().describe('Reminder triggers attached to the task.'),
    tags: z.array(z.string()).optional().describe('Tags attached to the task.'),
    repeatFlag: z.string().optional().describe('Recurrence rule of the task.'),
    priority: z.number().optional().describe('Task priority: 0 none, 1 low, 3 medium, 5 high.'),
    status: z.number().optional().describe('Task completion status: -1 abandoned, 0 normal, 2 completed.'),
    completedTime: z.string().optional().describe('Task completion time in "yyyy-MM-ddTHH:mm:ssZ" format.'),
    items: z.array(OutputChecklistItemSchema).optional().describe('Subtasks (checklist items) of the task.'),
    assigneeUsername: z.string().optional().describe('Username of the project member assigned to the task.'),
    kind: z.string().optional().describe('Task kind: "TEXT", "NOTE", or "CHECKLIST".'),
    parentId: z.string().optional().describe('Parent task identifier when the task is a subtask.'),
    etag: z.string().optional().describe('Entity tag of the task, updated on every write.'),
    createdTime: z.string().optional().describe('Task creation time in "yyyy-MM-ddTHH:mm:ssZ" format.'),
    modifiedTime: z.string().optional().describe('Task last-modified time in "yyyy-MM-ddTHH:mm:ssZ" format.')
});

const OutputSchema = z
    .object({
        projectId: z.string().describe('ID of the project the task was created in.'),
        projectName: z.string().describe('Name of the resolved existing project or the newly created project.'),
        projectCreated: z.boolean().describe('True when no existing project matched the name and a new project was created.'),
        task: OutputTaskSchema.describe('The task as returned by TickTick after creation.')
    })
    .describe('Result of creating a task in a named project, including the resolved project ID and whether the project was newly created.');

function toOutputChecklistItem(item: z.infer<typeof ProviderChecklistItemSchema>): z.infer<typeof OutputChecklistItemSchema> {
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

function toOutputTask(task: z.infer<typeof ProviderTaskSchema>): z.infer<typeof OutputTaskSchema> {
    return {
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        ...(task.sortOrder != null && { sortOrder: task.sortOrder }),
        ...(task.content != null && { content: task.content }),
        ...(task.desc != null && { desc: task.desc }),
        ...(task.startDate != null && { startDate: task.startDate }),
        ...(task.dueDate != null && { dueDate: task.dueDate }),
        ...(task.timeZone != null && { timeZone: task.timeZone }),
        ...(task.isAllDay != null && { isAllDay: task.isAllDay }),
        ...(task.reminders != null && { reminders: task.reminders }),
        ...(task.tags != null && { tags: task.tags }),
        ...(task.repeatFlag != null && { repeatFlag: task.repeatFlag }),
        ...(task.priority != null && { priority: task.priority }),
        ...(task.status != null && { status: task.status }),
        ...(task.completedTime != null && { completedTime: task.completedTime }),
        ...(task.items != null && { items: task.items.map(toOutputChecklistItem) }),
        ...(task.assigneeUsername != null && { assigneeUsername: task.assigneeUsername }),
        ...(task.kind != null && { kind: task.kind }),
        ...(task.parentId != null && { parentId: task.parentId }),
        ...(task.etag != null && { etag: task.etag }),
        ...(task.createdTime != null && { createdTime: task.createdTime }),
        ...(task.modifiedTime != null && { modifiedTime: task.modifiedTime })
    };
}

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing project list to resolve the caller-supplied name, then creates a task and, when no project matches, creates the project via the provider.
 * @pitfalls: Project name matching is case-sensitive, so a differently-cased name creates a second project instead of reusing the existing one, and because TickTick creates are not upserts, every invocation adds a new task (repeated calls produce duplicates).
 */
const action = createAction({
    description: 'COMPOSITE: create a task inside a project identified by NAME, creating that project first if no project with that name exists yet.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read', 'tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = 200;
        let offset = 0;
        let project: z.infer<typeof ProviderProjectSchema> | undefined = undefined;

        while (project === undefined) {
            // https://developer.ticktick.com/docs/openapi.md (Get User Project)
            const response = await nango.get({
                endpoint: '/open/v1/project',
                params: {
                    offset,
                    limit: pageSize
                },
                retries: 3
            });

            const projects = z.array(ProviderProjectSchema).parse(response.data);
            project = projects.find((candidate) => candidate.name === input.projectName);

            if (project !== undefined || projects.length < pageSize) {
                break;
            }

            offset += pageSize;
        }

        let projectCreated = false;

        if (project === undefined) {
            // https://developer.ticktick.com/docs/openapi.md (Create Project)
            const createProjectResponse = await nango.post({
                endpoint: '/open/v1/project',
                data: {
                    name: input.projectName
                },
                // Project creation is non-idempotent with no idempotency key; a retry could create a duplicate project.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });

            project = ProviderProjectSchema.parse(createProjectResponse.data);
            projectCreated = true;
        }

        const taskData: Record<string, unknown> = {
            title: input.title,
            projectId: project.id
        };

        if (input.content !== undefined) {
            taskData['content'] = input.content;
        }
        if (input.desc !== undefined) {
            taskData['desc'] = input.desc;
        }
        if (input.isAllDay !== undefined) {
            taskData['isAllDay'] = input.isAllDay;
        }
        if (input.startDate !== undefined) {
            taskData['startDate'] = input.startDate;
        }
        if (input.dueDate !== undefined) {
            taskData['dueDate'] = input.dueDate;
        }
        if (input.timeZone !== undefined) {
            taskData['timeZone'] = input.timeZone;
        }
        if (input.reminders !== undefined) {
            taskData['reminders'] = input.reminders;
        }
        if (input.tags !== undefined) {
            taskData['tags'] = input.tags;
        }
        if (input.repeatFlag !== undefined) {
            taskData['repeatFlag'] = input.repeatFlag;
        }
        if (input.priority !== undefined) {
            taskData['priority'] = input.priority;
        }
        if (input.sortOrder !== undefined) {
            taskData['sortOrder'] = input.sortOrder;
        }
        if (input.items !== undefined) {
            taskData['items'] = input.items;
        }

        // https://developer.ticktick.com/docs/openapi.md (Create Task)
        const createTaskResponse = await nango.post({
            endpoint: '/open/v1/task',
            data: taskData,
            // Task creation is non-idempotent with no idempotency key; a retry could create a duplicate task.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const task = ProviderTaskSchema.parse(createTaskResponse.data);

        return {
            projectId: project.id,
            projectName: project.name,
            projectCreated,
            task: toOutputTask(task)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
