import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('The ID of the task to close. Example: "6h78Pj92jVFp2Xcq"')
});

const OutputSchema = z.object({
    id: z.string(),
    is_closed: z.boolean()
});

const action = createAction({
    description: 'Mark a task complete (close it).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://developer.todoist.com/api/v1/#close-a-task
            endpoint: `/api/v1/tasks/${encodeURIComponent(input.task_id)}/close`,
            retries: 1
        });

        return {
            id: input.task_id,
            is_closed: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
