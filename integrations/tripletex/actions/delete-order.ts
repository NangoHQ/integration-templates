import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Order ID to delete. Example: 210311957')
});

const OutputSchema = z.object({
    id: z.number().describe('Deleted order ID')
});

const action = createAction({
    description: 'Delete an order',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        await nango.delete({
            endpoint: `v2/order/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
