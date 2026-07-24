import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    label_id: z.string().describe('The ID of the personal label to delete. Example: "2184371052"')
});

const OutputSchema = z.object({
    success: z.literal(true)
});

const action = createAction({
    description: 'Delete a personal label.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.todoist.com/api/v1/#delete-a-label
        await nango.delete({
            endpoint: `/api/v1/labels/${encodeURIComponent(input.label_id)}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
