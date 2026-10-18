import { z } from 'zod';
import { createAction } from 'nango';

const TaskStatusSchema = z.enum(['needsAction', 'completed']);

const TaskLinkSchema = z.object({
    type: z.string().optional().describe('Type of the link, e.g. "email", "generic", "chat_message", or "keep_note".'),
    description: z.string().optional().describe('Human-readable description of the link, if any.'),
    link: z.string().optional().describe('The URL the link points to.')
});

const AssignmentInfoSchema = z.object({
    linkToTask: z.string().optional().describe('Absolute link to the original task in the surface it was assigned from (Docs or Chat spaces).'),
    surfaceType: z.string().optional().describe('The product the task was assigned from, e.g. "DOCUMENT" or "SPACE".')
});

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list identifier to create the task in. Use "@default" for the authenticated user\'s default list.'),
        title: z.string().describe('Title of the new task (maximum 1024 characters).'),
        notes: z.string().optional().describe('Notes describing the task (maximum 8192 characters).'),
        due: z.string().optional().describe('Due date as an RFC 3339 timestamp. Only the date portion is stored.'),
        status: TaskStatusSchema.optional().describe('Status of the task. Defaults to "needsAction" when omitted.'),
        parent: z.string().optional().describe('Identifier of the parent task to create this task under. Omit to create a top-level task.'),
        previous: z
            .string()
            .optional()
            .describe('Identifier of the sibling task to place this new task immediately after. Omit to place it first among its siblings.')
    })
    .describe('Parameters for creating a new task in a Google Tasks list.');

const OutputSchema = z
    .object({
        id: z.string().describe('Task identifier assigned by Google Tasks.'),
        title: z.string().optional().describe('Title of the created task.'),
        notes: z.string().optional().describe('Notes describing the task.'),
        status: z.string().optional().describe('Status of the task: "needsAction" or "completed".'),
        due: z.string().optional().describe('Due date of the task as an RFC 3339 timestamp (time portion discarded).'),
        completed: z.string().optional().describe('Completion timestamp as an RFC 3339 timestamp, present only if the task is completed.'),
        parent: z.string().optional().describe('Parent task identifier, present only for subtasks.'),
        position: z.string().optional().describe('Lexicographic position of the task among its siblings.'),
        deleted: z.boolean().optional().describe('Whether the task has been deleted.'),
        hidden: z.boolean().optional().describe('Whether the task is hidden because it was completed when the list was last cleared.'),
        updated: z.string().optional().describe('Last modification timestamp as an RFC 3339 timestamp.'),
        etag: z.string().optional().describe('ETag of the task resource.'),
        selfLink: z.string().optional().describe('URL pointing to this task.'),
        webViewLink: z.string().optional().describe('Absolute link to the task in the Google Tasks web UI.'),
        kind: z.string().optional().describe('Resource type; always "tasks#task".'),
        links: z.array(TaskLinkSchema).optional().describe('Collection of links associated with the task.'),
        assignmentInfo: AssignmentInfoSchema.optional().describe('Assignment context, present for tasks assigned from Docs or Chat Spaces.')
    })
    .describe('The task created in the Google Tasks list.');

/**
 * @tags: [write]
 * @tagReason: Creates a new task in a Google Tasks list, which is a provider mutation.
 * @pitfalls: `parent` and `previous` must reference existing tasks in the same list, and `parent` cannot be an assigned task, otherwise the request fails; each list is capped at 20,000 non-hidden tasks.
 */
const action = createAction({
    description: 'Create a new task in a list, optionally as a subtask of an existing task and/or positioned after a specific sibling.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/insert
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks`,
            params: {
                ...(input.parent !== undefined && { parent: input.parent }),
                ...(input.previous !== undefined && { previous: input.previous })
            },
            data: {
                title: input.title,
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.due !== undefined && { due: input.due }),
                ...(input.status !== undefined && { status: input.status })
            },
            // Creating a task is not idempotent; a retry after a lost response would create a duplicate task.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
