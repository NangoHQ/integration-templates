import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskSchema, TaskSchema, toTask } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z.string().describe('Identifier of the task list that contains the task, or "@default" for the authenticated user\'s primary list.'),
        task: z.string().describe('Identifier of the task to patch.'),
        title: z.string().optional().describe('New title for the task. Omit to leave the current title unchanged.'),
        notes: z
            .string()
            .nullable()
            .optional()
            .describe('New free-form notes for the task. Set to null or an empty string to clear the notes. Omit to leave them unchanged.'),
        status: z.enum(['needsAction', 'completed']).optional().describe('New completion status for the task. Omit to leave the current status unchanged.'),
        due: z
            .string()
            .nullable()
            .optional()
            .describe(
                'New due date as an RFC 3339 timestamp; only the date portion is stored. Set to null or an empty string to clear the due date. Omit to leave it unchanged.'
            )
    })
    .describe('Fields to partially update on an existing Google Task; only the provided fields are changed.');

const OutputSchema = TaskSchema.describe('The task after the partial update, with all of its current fields.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing task through a partial update, changing only the fields supplied by the caller while leaving all other fields untouched.
 * @pitfalls: Setting status to "completed" also completes the task's subtasks, while reopening a subtask does not reopen its parent; notes or due are only cleared by passing null or an empty string because omitted fields are left unchanged.
 */
const action = createAction({
    description: 'Partially update a task (PATCH): only the fields you pass change and everything else is left untouched. Use update-task to replace the whole task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/tasks/reference/rest/v1/tasks/patch
        const response = await nango.patch({
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`,
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.due !== undefined && { due: input.due })
            },
            retries: 3
        });

        return toTask(ProviderTaskSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
