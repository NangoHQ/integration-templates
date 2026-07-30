import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.number().describe('The ID of the task to delete. Example: 165909246')
});

const OutputSchema = z.object({
    id: z.number(),
    status: z.literal('deleted')
});

const action = createAction({
    description: 'Delete (soft-delete) a task',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.hubstaff.com/
            endpoint: `v2/tasks/${encodeURIComponent(String(input.task_id))}`,
            retries: 3
        });

        return {
            id: input.task_id,
            status: 'deleted'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
