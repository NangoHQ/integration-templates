import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Opportunity ID. Example: "oppo_OCMnOPla5NoAH69U3S9cZiiWjptaqpCAUPBFWS0yOXo"')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete an opportunity',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developer.close.com/
            endpoint: `/v1/opportunity/${encodeURIComponent(input.id)}/`,
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
