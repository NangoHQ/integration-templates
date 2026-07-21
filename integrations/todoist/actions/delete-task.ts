import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('The ID of the task to delete. Example: "6h78PhwG6Mpjx4PH"')
});

const OutputSchema = z.object({
    task_id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.todoist.com/api/v1/#delete-task
            endpoint: `/api/v1/tasks/${encodeURIComponent(input.task_id)}`,
            retries: 10
        });

        return {
            task_id: input.task_id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
