import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    taskId: z.string().describe('The ID of the task to delete. Example: "86c9w2nke"')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Delete a task in ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/deletetask
        await nango.delete({
            endpoint: `/api/v2/task/${encodeURIComponent(input.taskId)}`,
            retries: 10
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
