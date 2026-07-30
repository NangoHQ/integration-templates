import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Project ID. Example: 210311946')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        await nango.delete({
            endpoint: `v2/project/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
