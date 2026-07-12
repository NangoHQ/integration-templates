import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    story_public_id: z.number().int().describe('The unique ID of the story containing the task. Example: 35'),
    task_id: z.number().int().describe('The unique ID of the task to delete. Example: 39')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a task from a story.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shortcut.com/api/rest/v3
        await nango.delete({
            endpoint: `/api/v3/stories/${encodeURIComponent(String(input.story_public_id))}/tasks/${encodeURIComponent(String(input.task_id))}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
