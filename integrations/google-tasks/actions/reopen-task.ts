import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list ID, or "@default" for the authenticated user\'s primary list. Example: "@default"'),
        task: z.string().describe('ID of the task to reopen. Example: "WnpnNlRJR2tYYjJGLVFJZg"')
    })
    .describe('Identifies the task to reopen within a task list.');

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    status: z.enum(['needsAction', 'completed']).optional(),
    notes: z.string().optional(),
    due: z.string().optional(),
    completed: z.string().optional(),
    deleted: z.boolean().optional(),
    hidden: z.boolean().optional(),
    parent: z.string().optional(),
    position: z.string().optional(),
    updated: z.string().optional(),
    webViewLink: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Task identifier. Example: "WnpnNlRJR2tYYjJGLVFJZg"'),
        status: z.enum(['needsAction', 'completed']).optional().describe('Task status after reopening. Example: "needsAction"'),
        title: z.string().optional().describe('Task title. Example: "Nango Reopen Task"'),
        notes: z.string().optional().describe('Free-form notes attached to the task.'),
        due: z.string().optional().describe('Due date in RFC 3339 format. Example: "2026-10-20T00:00:00.000Z"'),
        completed: z.string().optional().describe('Completion timestamp in RFC 3339 format; removed when the task is reopened.'),
        deleted: z.boolean().optional().describe('True when the task has been deleted (delete tombstone).'),
        hidden: z.boolean().optional().describe('True when the task is hidden from the default view (e.g. after clearing completed tasks).'),
        parent: z.string().optional().describe('ID of the parent task when this is a subtask.'),
        position: z.string().optional().describe('Position of the task among its siblings.'),
        updated: z.string().optional().describe('Last modification timestamp in RFC 3339 format.'),
        webViewLink: z.string().optional().describe('URL to open the task in the Google Tasks UI.')
    })
    .describe('The reopened task as returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Patches a task's status to "needsAction" on the provider, mutating its completion state.
 */
const action = createAction({
    description: 'Mark a completed task as not done again, undoing its completion and un-hiding it if it was hidden.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/patch
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`,
            data: {
                status: 'needsAction'
            },
            retries: 3
        });

        const task = ProviderTaskSchema.parse(response.data);

        return {
            id: task.id,
            ...(task.status !== undefined && { status: task.status }),
            ...(task.title !== undefined && { title: task.title }),
            ...(task.notes !== undefined && { notes: task.notes }),
            ...(task.due !== undefined && { due: task.due }),
            ...(task.completed !== undefined && { completed: task.completed }),
            ...(task.deleted !== undefined && { deleted: task.deleted }),
            ...(task.hidden !== undefined && { hidden: task.hidden }),
            ...(task.parent !== undefined && { parent: task.parent }),
            ...(task.position !== undefined && { position: task.position }),
            ...(task.updated !== undefined && { updated: task.updated }),
            ...(task.webViewLink !== undefined && { webViewLink: task.webViewLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
