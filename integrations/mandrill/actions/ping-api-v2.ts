import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderOutputSchema = z.object({
    PING: z.string()
});

const OutputSchema = z.object({
    PING: z.string()
});

const action = createAction({
    description: 'Validate an API key using the JSON parser version of the ping.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/users/
            endpoint: '1.0/users/ping2.json',
            data: {},
            retries: 3
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        return {
            PING: providerOutput.PING
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
