import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Category ID. Example: 32')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.shortcut.com/api/rest/v3#Delete-Category
            endpoint: `/api/v3/categories/${encodeURIComponent(String(input.id))}`,
            retries: 10
        });

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
