import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The department identifier. Example: "92b7d"')
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Permanently delete a department.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_departments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://workable.readme.io/reference/departments-delete
        await nango.delete({
            endpoint: `/spi/v3/departments/${encodeURIComponent(input.id)}`,
            params: {
                force: 'DELETE'
            },
            retries: 3
        });

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
