import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Close task ID. Example: "task_123"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a Close task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.close.com/
        await nango.delete({
            endpoint: `/v1/task/${encodeURIComponent(input.id)}/`,
            retries: 1
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
