import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the SetupIntent to retrieve. Example: seti_1TbSoQEZpD6kXraey8RhA0h1')
});

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Retrieve a single setup intent from Stripe.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.stripe.com/api/setup_intents/retrieve
        const response = await nango.get({
            endpoint: `/v1/setup_intents/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'SetupIntent not found',
                id: input.id
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
