import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskListSchema, ProviderTaskSchema } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list identifier or the special "@default" alias for the authenticated user\'s primary list. Example: "@default"'),
        showCompleted: z.boolean().optional().describe('Include completed tasks. Defaults to true.'),
        showHidden: z.boolean().optional().describe('Include tasks hidden by a previous clear-completed call. Defaults to true.'),
        showDeleted: z.boolean().optional().describe('Include deleted-task tombstones (status "deleted"). Defaults to false.')
    })
    .describe('Input for fetching one task list and reconstructing its full nested task tree.');

const TaskLinkSchema = z.object({
    type: z.string().optional().describe('Link type, for example "email".'),
    description: z.string().optional().describe('Human-readable description of the link.'),
    link: z.string().optional().describe('The link URL.')
});

type TaskNode = {
    id: string;
    title?: string | undefined;
    notes?: string | undefined;
    status?: string | undefined;
    due?: string | undefined;
    completed?: string | undefined;
    deleted?: boolean | undefined;
    hidden?: boolean | undefined;
    parent?: string | undefined;
    position?: string | undefined;
    updated?: string | undefined;
    selfLink?: string | undefined;
    webViewLink?: string | undefined;
    links: z.infer<typeof TaskLinkSchema>[];
    children: TaskNode[];
};

const TaskNodeSchema: z.ZodType<TaskNode> = z.lazy(() =>
    z.object({
        id: z.string().describe('Task identifier.'),
        title: z.string().optional().describe('Task title.'),
        notes: z.string().optional().describe('Free-form notes attached to the task.'),
        status: z.string().optional().describe('Task status, either "needsAction" or "completed".'),
        due: z.string().optional().describe('Due date of the task in RFC 3339 format.'),
        completed: z.string().optional().describe('Completion timestamp in RFC 3339 format, present on completed tasks.'),
        deleted: z.boolean().optional().describe('True when the task has been deleted (only returned when showDeleted is true).'),
        hidden: z.boolean().optional().describe('True when the task was hidden by a clear-completed call (only returned when showHidden is true).'),
        parent: z.string().optional().describe('Identifier of the parent task, present only on subtasks.'),
        position: z.string().optional().describe('Lexicographic value used to order sibling tasks.'),
        updated: z.string().optional().describe('Last modification timestamp in RFC 3339 format.'),
        selfLink: z.string().optional().describe('API URL of the task.'),
        webViewLink: z.string().optional().describe('Google Tasks web URL of the task.'),
        links: z.array(TaskLinkSchema).describe('External links attached to the task.'),
        children: z.array(TaskNodeSchema).describe('Nested subtasks ordered by position.')
    })
);

const OutputSchema = z
    .object({
        tasklist: z
            .object({
                id: z.string().describe('Task list identifier.'),
                title: z.string().optional().describe('Task list title.')
            })
            .describe('Metadata of the requested task list.'),
        tree: z.array(TaskNodeSchema).describe('Top-level tasks of the list, each with its subtasks nested under children.')
    })
    .describe('A task list plus all of its tasks reconstructed into a nested parent/child tree.');

const ProviderTasksPageSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional().nullable(),
    items: z.array(ProviderTaskSchema).optional().nullable(),
    nextPageToken: z.string().optional().nullable()
});

/**
 * @tags: [read]
 * @tagReason: Fetches the task list metadata and every task in it; it never creates, modifies, or deletes provider data.
 * @pitfalls: Because the tree is rebuilt from a flat list, filtering out a parent with showCompleted=false or showHidden=false promotes its still-visible subtasks to top-level roots, and showHidden=false hides tasks cleared by clear-completed.
 */
const action = createAction({
    description: 'Fetch a task list with all of its tasks, with the subtask hierarchy reconstructed into a nested tree.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tasklist = encodeURIComponent(input.tasklist);

        // https://developers.google.com/tasks/reference/rest/v1/tasklists/get
        const listResponse = await nango.get({
            endpoint: `/tasks/v1/users/@me/lists/${tasklist}`,
            retries: 3
        });

        const taskList = ProviderTaskListSchema.parse(listResponse.data);

        const tasks: z.infer<typeof ProviderTaskSchema>[] = [];
        let pageToken: string | undefined;
        do {
            // https://developers.google.com/tasks/reference/rest/v1/tasks/list
            const tasksResponse = await nango.get({
                endpoint: `/tasks/v1/lists/${tasklist}/tasks`,
                params: {
                    maxResults: 100,
                    showCompleted: String(input.showCompleted ?? true),
                    showHidden: String(input.showHidden ?? true),
                    showDeleted: String(input.showDeleted ?? false),
                    ...(pageToken !== undefined && { pageToken })
                },
                retries: 3
            });

            const page = ProviderTasksPageSchema.parse(tasksResponse.data);
            tasks.push(...(page.items ?? []));
            pageToken = page.nextPageToken ?? undefined;
        } while (pageToken !== undefined);

        const nodesById = new Map<string, TaskNode>();
        for (const task of tasks) {
            nodesById.set(task.id, {
                id: task.id,
                ...(task.title != null && { title: task.title }),
                ...(task.notes != null && { notes: task.notes }),
                ...(task.status != null && { status: task.status }),
                ...(task.due != null && { due: task.due }),
                ...(task.completed != null && { completed: task.completed }),
                ...(task.deleted != null && { deleted: task.deleted }),
                ...(task.hidden != null && { hidden: task.hidden }),
                ...(task.parent != null && { parent: task.parent }),
                ...(task.position != null && { position: task.position }),
                ...(task.updated != null && { updated: task.updated }),
                ...(task.selfLink != null && { selfLink: task.selfLink }),
                ...(task.webViewLink != null && { webViewLink: task.webViewLink }),
                links: (task.links ?? []).map((link) => ({
                    ...(link.type != null && { type: link.type }),
                    ...(link.description != null && { description: link.description }),
                    ...(link.link != null && { link: link.link })
                })),
                children: []
            });
        }

        const roots: TaskNode[] = [];
        for (const task of tasks) {
            const node = nodesById.get(task.id);
            if (!node) {
                continue;
            }
            const parent = task.parent != null ? nodesById.get(task.parent) : undefined;
            if (parent) {
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }

        const byPosition = (a: TaskNode, b: TaskNode): number => (a.position ?? '').localeCompare(b.position ?? '');
        roots.sort(byPosition);
        for (const node of nodesById.values()) {
            node.children.sort(byPosition);
        }

        return {
            tasklist: {
                id: taskList.id,
                ...(taskList.title != null && { title: taskList.title })
            },
            tree: roots
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
