import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        tasklist_id: z
            .string()
            .describe(
                'Task list identifier that owns the task. Use "@default" for the authenticated user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'
            ),
        task_id: z.string().describe('Identifier of the task to replace. Example: "NGhVdGtWUGotQ0JqcnVKWg"'),
        title: z.string().describe('Title of the task. Maximum length: 1024 characters. Required because this call replaces the whole task.'),
        notes: z.string().nullable().optional().describe('Notes describing the task. Maximum length: 8192 characters. Omit or pass null to clear the notes.'),
        status: z
            .enum(['needsAction', 'completed'])
            .nullable()
            .optional()
            .describe(
                'Task status. "completed" marks the task done and stamps the completion time; "needsAction" reopens it. Omit or pass null to reset it to "needsAction".'
            ),
        due: z
            .string()
            .nullable()
            .optional()
            .describe(
                'Due date as an RFC 3339 timestamp. Only the date is stored, the time is discarded. Omit or pass null to clear the due date. Example: "2026-12-31T00:00:00.000Z"'
            )
    })
    .describe('Input for replacing a task with a full PUT request.');

const TaskLinkSchema = z.object({
    type: z.string().optional().describe('Type of the link, for example "email", "generic", "chat_message", or "keep_note".'),
    description: z.string().optional().describe('Human readable description of the link. May be empty.'),
    link: z.string().optional().describe('The URL the link points to.')
});

const OutputSchema = z
    .object({
        kind: z.string().optional().describe('Type of the resource, always "tasks#task".'),
        id: z.string().describe('Task identifier.'),
        etag: z.string().optional().describe('ETag of the task, changes whenever the task is modified.'),
        title: z.string().optional().describe('Title of the task.'),
        updated: z.string().optional().describe('Last modification time of the task as an RFC 3339 timestamp.'),
        selfLink: z.string().optional().describe('URL that points to this task and can be used to retrieve, update, or delete it.'),
        parent: z.string().nullable().optional().describe('Identifier of the parent task when this is a subtask; absent for top-level tasks. Read-only.'),
        position: z.string().optional().describe('Opaque ordering string of the task among its siblings; compare lexicographically. Read-only.'),
        notes: z.string().nullable().optional().describe('Notes describing the task; absent when the task has no notes.'),
        status: z.string().optional().describe('Task status, either "needsAction" or "completed".'),
        due: z
            .string()
            .nullable()
            .optional()
            .describe('Due date as an RFC 3339 timestamp; only the date portion is meaningful. Absent when the task has no due date.'),
        completed: z.string().nullable().optional().describe('Completion time as an RFC 3339 timestamp; absent when the task is not completed. Read-only.'),
        deleted: z.boolean().optional().describe('Whether the task has been deleted. Absent or false for active tasks.'),
        hidden: z.boolean().optional().describe('Whether the task is hidden because it was completed when the list was last cleared. Read-only.'),
        links: z.array(TaskLinkSchema).optional().describe('Related links attached to the task, such as emails or chat messages. Read-only.'),
        webViewLink: z.string().optional().describe('Absolute link to the task in the Google Tasks web UI. Read-only.')
    })
    .describe('The task as returned by Google Tasks after the full replacement.');

/**
 * @tags: [write, destructive]
 * @tagReason: Replaces the task through a provider PUT mutation; because it is a full replace, any field omitted from the request is cleared rather than preserved, which can wipe existing task data.
 * @pitfalls: This is a full replace, not a merge: any field you omit (notes, status, due) is cleared rather than preserved, so send the complete desired state; due records only the date with the time discarded, and parent/position are read-only here and can only be changed via a move action.
 */
const action = createAction({
    description: 'Replace a task (full PUT), clearing any field omitted from the request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            id: input.task_id,
            title: input.title
        };

        if (input.notes !== undefined) {
            data['notes'] = input.notes;
        }
        if (input.status !== undefined) {
            data['status'] = input.status;
        }
        if (input.due !== undefined) {
            data['due'] = input.due;
        }

        const config: ProxyConfiguration = {
            // https://developers.google.com/tasks/reference/rest/v1/tasks/update
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist_id)}/tasks/${encodeURIComponent(input.task_id)}`,
            data,
            retries: 3
        };

        const response = await nango.put(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
