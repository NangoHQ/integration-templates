import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('The ID of the doc to delete. Example: "a97K6uAljP"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Permanently delete a doc.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/delete-doc'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://coda.io/developers/apis/v1
        await nango.delete({
            endpoint: `/docs/${encodeURIComponent(input.docId)}`,
            retries: 1
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
