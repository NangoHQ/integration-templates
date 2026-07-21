import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('The ID of the task to reopen. Example: "6h78Pj92jVFp2Xcq"')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Reopen (uncomplete) a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://developer.todoist.com/api/v1/#reopen-a-task
            endpoint: `/api/v1/tasks/${encodeURIComponent(input.task_id)}/reopen`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
