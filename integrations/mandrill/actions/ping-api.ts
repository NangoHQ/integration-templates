import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    result: z.string()
});

const action = createAction({
    description: 'Validate an API key and respond to a ping (legacy parser).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://mailchimp.com/developer/transactional/api/users/ping/
            endpoint: '/1.3/users/ping',
            data: {},
            retries: 3
        };

        const response = await nango.post(config);

        const result = z.string().parse(response.data);

        return {
            result
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
