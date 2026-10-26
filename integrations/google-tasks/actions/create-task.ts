import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskSchema, TaskSchema, toTask } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list identifier to create the task in. Use "@default" for the authenticated user\'s default list.'),
        title: z.string().describe('Title of the new task (maximum 1024 characters).'),
        notes: z.string().optional().describe('Notes describing the task (maximum 8192 characters).'),
        due: z.string().optional().describe('Due date as an RFC 3339 timestamp. Only the date portion is stored.'),
        status: z.enum(['needsAction', 'completed']).optional().describe('Status of the task. Defaults to "needsAction" when omitted.'),
        parent: z.string().optional().describe('Identifier of the parent task to create this task under. Omit to create a top-level task.'),
        previous: z
            .string()
            .optional()
            .describe('Identifier of the sibling task to place this new task immediately after. Omit to place it first among its siblings.')
    })
    .describe('Parameters for creating a new task in a Google Tasks list.');

const OutputSchema = TaskSchema.describe('The task created in the Google Tasks list.');

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

        return toTask(ProviderTaskSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
