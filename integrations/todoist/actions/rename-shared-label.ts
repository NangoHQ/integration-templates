import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Current label name to rename across tasks. Example: "nango-seed-keep"'),
    new_name: z.string().min(1).describe('New label name to apply across tasks. Example: "nango-seed-renamed"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Rename a label string across every task that references it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://developer.todoist.com/api/v1/#rename-a-shared-label
            endpoint: '/api/v1/labels/shared/rename',
            data: {
                name: input.name,
                new_name: input.new_name
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
