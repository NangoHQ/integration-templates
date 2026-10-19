import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskSchema, TaskSchema, toTask } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list identifier. Use "@default" to target the primary task list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        task: z.string().describe('Identifier of the task to mark as completed. Example: "LWlneng5SFhnU2IyN2h4Qg"')
    })
    .describe('Identifies the task to mark as completed.');

const OutputSchema = TaskSchema.describe('The task resource returned after it was marked as completed.');

/**
 * @tags: [write]
 * @tagReason: Marks the task as completed by patching its status on the provider; it does not read or delete provider data.
 * @pitfalls: Completing a parent task also auto-completes all of its subtasks; re-completing an already-completed task succeeds but leaves its original completion timestamp unchanged.
 */
const action = createAction({
    description: 'Mark a task as completed. NOTE: if this task has subtasks, they are auto-completed too - see comments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/tasks/reference/rest/v1/tasks/patch
        const response = await nango.patch({
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`,
            data: {
                status: 'completed'
            },
            // Setting an absolute status is idempotent: repeating the request leaves the task completed.
            retries: 3
        });

        return toTask(ProviderTaskSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
