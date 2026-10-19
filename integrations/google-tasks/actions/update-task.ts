import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskSchema, TaskSchema, toTask } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .describe(
                'Task list identifier that owns the task. Use "@default" for the authenticated user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'
            ),
        task: z.string().describe('Identifier of the task to replace. Example: "NGhVdGtWUGotQ0JqcnVKWg"'),
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
    .describe('Input for replacing a task with a full PUT request. Every writable field you omit is cleared.');

const OutputSchema = TaskSchema.describe('The task as returned by Google Tasks after the full replacement.');

/**
 * @tags: [write, destructive]
 * @tagReason: Replaces the task through a provider PUT mutation; because it is a full replace, any field omitted from the request is cleared rather than preserved, which can wipe existing task data.
 * @pitfalls: This is a full replace, not a merge: any field you omit (notes, status, due) is cleared rather than preserved, so send the complete desired state or use patch-task instead; due records only the date with the time discarded, and parent/position are read-only here and can only be changed via move-task.
 */
const action = createAction({
    description: 'Replace a task (full PUT): notes, status, and due are cleared or reset when omitted. Use patch-task to change only some fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/update
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`,
            data: {
                id: input.task,
                title: input.title,
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.due !== undefined && { due: input.due })
            },
            // A full replace with the same body is idempotent.
            retries: 3
        });

        return toTask(ProviderTaskSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
