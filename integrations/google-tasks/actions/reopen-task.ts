import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskSchema, TaskSchema, toTask } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list ID, or "@default" for the authenticated user\'s primary list. Example: "@default"'),
        task: z.string().describe('ID of the task to reopen. Example: "WnpnNlRJR2tYYjJGLVFJZg"')
    })
    .describe('Identifies the task to reopen within a task list.');

const OutputSchema = TaskSchema.describe('The reopened task as returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Patches a task's status to "needsAction" on the provider, mutating its completion state.
 * @pitfalls: Reopening a subtask does not reopen its completed parent.
 */
const action = createAction({
    description: 'Mark a completed task as not done again, undoing its completion and un-hiding it if it was hidden.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/patch
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`,
            data: {
                status: 'needsAction'
            },
            // Setting an absolute status is idempotent: repeating the request leaves the task open.
            retries: 3
        });

        return toTask(ProviderTaskSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
