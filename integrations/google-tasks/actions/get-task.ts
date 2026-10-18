import { z } from 'zod';
import { createAction } from 'nango';

const TaskLinkSchema = z.object({
    type: z.string().optional().describe('The link type, for example "email" or "chat".'),
    description: z.string().optional().describe('A human-readable description of the link.'),
    link: z.string().optional().describe('The URL of the link.')
});

const ProviderTaskSchema = z.object({
    kind: z.string().optional(),
    id: z.string(),
    etag: z.string().optional(),
    title: z.string().optional(),
    updated: z.string().optional(),
    selfLink: z.string().optional(),
    parent: z.string().optional().nullable(),
    position: z.string().optional(),
    notes: z.string().optional().nullable(),
    status: z.string().optional(),
    due: z.string().optional().nullable(),
    completed: z.string().optional().nullable(),
    deleted: z.boolean().optional(),
    hidden: z.boolean().optional(),
    links: z.array(TaskLinkSchema).optional(),
    webViewLink: z.string().optional().nullable()
});

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list identifier. Use the list ID, or "@default" for the user\'s default task list.'),
        task: z.string().describe('Task identifier of the task to retrieve.')
    })
    .describe('Identifies the task to retrieve within a specific task list.');

const OutputSchema = z
    .object({
        kind: z.string().optional().describe('Resource type identifier, always "tasks#task".'),
        id: z.string().describe('Task identifier.'),
        etag: z.string().optional().describe('ETag of the task, used for optimistic concurrency.'),
        title: z.string().optional().describe('Title of the task.'),
        updated: z.string().optional().describe('Last modification time of the task (RFC 3339 timestamp).'),
        selfLink: z.string().optional().describe('URL pointing to this task resource.'),
        parent: z.string().optional().describe('Identifier of the parent task when this task is a subtask.'),
        position: z.string().optional().describe('Position of the task among its siblings; lexicographically ordered.'),
        notes: z.string().optional().describe('Free-form notes attached to the task.'),
        status: z.string().optional().describe('Task status, either "needsAction" or "completed".'),
        due: z.string().optional().describe('Due date of the task (RFC 3339 timestamp).'),
        completed: z.string().optional().describe('Completion time of the task (RFC 3339 timestamp); set only when completed.'),
        deleted: z.boolean().optional().describe('True when the task has been deleted; deleted tasks are returned as tombstones rather than 404.'),
        hidden: z.boolean().optional().describe('True when the task is hidden, for example after clearing completed tasks.'),
        links: z.array(TaskLinkSchema).optional().describe('Collection of links attached to the task.'),
        webViewLink: z.string().optional().describe('URL to open the task in the Google Tasks web UI.')
    })
    .describe('The retrieved task, including tombstone fields such as deleted and hidden.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single task from a task list without mutating any provider state.
 * @pitfalls: A deleted task is returned as a tombstone with deleted: true rather than a 404; an invalid task list id returns a 400 while a deleted task list returns a 404.
 */
const action = createAction({
    description: 'Retrieve a single task by its list ID and task ID - including a deleted task, which is returned as a tombstone rather than a 404.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/get
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`,
            retries: 3
        });

        const task = ProviderTaskSchema.parse(response.data);

        return {
            ...(task.kind != null && { kind: task.kind }),
            id: task.id,
            ...(task.etag != null && { etag: task.etag }),
            ...(task.title != null && { title: task.title }),
            ...(task.updated != null && { updated: task.updated }),
            ...(task.selfLink != null && { selfLink: task.selfLink }),
            ...(task.parent != null && { parent: task.parent }),
            ...(task.position != null && { position: task.position }),
            ...(task.notes != null && { notes: task.notes }),
            ...(task.status != null && { status: task.status }),
            ...(task.due != null && { due: task.due }),
            ...(task.completed != null && { completed: task.completed }),
            ...(task.deleted != null && { deleted: task.deleted }),
            ...(task.hidden != null && { hidden: task.hidden }),
            ...(task.links != null && { links: task.links }),
            ...(task.webViewLink != null && { webViewLink: task.webViewLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
