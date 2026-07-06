import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    count: z.number()
});

const OutputSchema = z.object({
    count: z.number()
});

const action = createAction({
    description: 'Count unread emails.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/count-unread-emails' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/groups/email
            endpoint: '/v2/emails/unread/count',
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);

        return {
            count: data.count
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
