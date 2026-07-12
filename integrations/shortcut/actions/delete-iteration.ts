import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    iteration_public_id: z.number().describe('The unique ID of the Iteration. Example: 28')
});

const OutputSchema = z.object({
    success: z.boolean(),
    iteration_public_id: z.number()
});

const action = createAction({
    description: 'Delete an iteration.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developer.shortcut.com/api/rest/v3#Delete-Iteration
            endpoint: `/api/v3/iterations/${encodeURIComponent(String(input.iteration_public_id))}`,
            retries: 1
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Iteration ${input.iteration_public_id} not found.`,
                iteration_public_id: input.iteration_public_id
            });
        }

        return {
            success: true,
            iteration_public_id: input.iteration_public_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
