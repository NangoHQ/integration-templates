import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskSchema, TaskSchema, toTask } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list identifier. Use the list ID, or "@default" for the user\'s default task list.'),
        task: z.string().describe('Task identifier of the task to retrieve.')
    })
    .describe('Identifies the task to retrieve within a specific task list.');

const OutputSchema = TaskSchema.describe('The retrieved task, including tombstone fields such as deleted and hidden.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single task from a task list without mutating any provider state.
 * @pitfalls: A deleted task is returned as a tombstone with deleted: true rather than a 404; an invalid task list id returns a 400 while a deleted task list returns a 404.
 */
const action = createAction({
    description: 'Retrieve a single task by its list ID and task ID - including a deleted task, which is returned as a tombstone rather than a 404.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/get
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`,
            retries: 3
        });

        return toTask(ProviderTaskSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
