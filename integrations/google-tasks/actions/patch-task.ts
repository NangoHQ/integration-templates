import { z } from 'zod';
import { createAction } from 'nango';

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

const TaskLinkSchema = z.object({
    type: z.string().optional().describe('Type of the link, for example "email".'),
    description: z.string().optional().describe('Description of the link.'),
    link: z.string().optional().describe('The URL of the link.')
});

const OutputSchema = z
    .object({
        kind: z.string().optional().describe('Resource type identifier. Always "tasks#task".'),
        id: z.string().describe('Identifier of the task.'),
        etag: z.string().optional().describe('ETag of the task, which changes whenever the task is modified.'),
        title: z.string().optional().describe('Title of the task.'),
        updated: z.string().optional().describe('Last modification time of the task as an RFC 3339 timestamp.'),
        selfLink: z.string().optional().describe('URL that points to this task.'),
        parent: z.string().optional().describe('Identifier of the parent task when this task is a subtask.'),
        position: z.string().optional().describe('Position of the task among its sibling tasks.'),
        notes: z.string().optional().describe('Free-form notes attached to the task.'),
        status: z.string().optional().describe('Completion status, either "needsAction" or "completed".'),
        due: z.string().optional().describe('Due date of the task as an RFC 3339 timestamp.'),
        completed: z.string().optional().describe('Completion time of the task as an RFC 3339 timestamp, present only for completed tasks.'),
        deleted: z.boolean().optional().describe('Whether the task has been deleted.'),
        hidden: z.boolean().optional().describe('Whether the task is hidden from the default view.'),
        links: z.array(TaskLinkSchema).optional().describe('Links associated with the task.'),
        webViewLink: z.string().optional().describe('URL that opens the task in the Google Tasks UI.')
    })
    .describe('The task after the partial update, with all of its current fields.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing task through a partial update, changing only the fields supplied by the caller while leaving all other fields untouched.
 * @pitfalls: Setting status to "completed" also completes the task's subtasks, while reopening a subtask does not reopen its parent; notes or due are only cleared by passing null or an empty string because omitted fields are left unchanged.
 */
const action = createAction({
    description: 'Update only the specified fields of a task; everything else is left untouched. Does not require `id` in the body.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

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

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
