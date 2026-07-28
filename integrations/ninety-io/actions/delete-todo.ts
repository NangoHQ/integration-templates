import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('To-Do ID to delete. Example: "6a6174ad545a6c26e85e387e"')
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a to-do.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://help.ninety.io/en/articles/15505694-api-reference-and-access
        await nango.delete({
            endpoint: `/v1/todos/${encodeURIComponent(input.id)}`,
            retries: 1
        });

        return {
            id: input.id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
