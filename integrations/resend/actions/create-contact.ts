import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: contacts/create
const InputSchema = z
    .object({
        body: z
            .object({
                email: z.string(),
                first_name: z.string().optional(),
                last_name: z.string().optional(),
                unsubscribed: z.boolean().optional(),
                properties: z.object({}).passthrough().optional(),
                segments: z.array(z.object({ id: z.string().optional() }).passthrough()).optional(),
                topics: z.array(z.object({ id: z.string().optional(), subscription: z.enum(['opt_in', 'opt_out']).optional() }).passthrough()).optional(),
                audience_id: z.string().optional()
            })
            .passthrough()
    })
    .passthrough();

const ProviderResponseSchema = z.object({ object: z.string().optional(), id: z.string().optional() }).passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Create a new contact in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/contacts`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Retrying a non-idempotent POST can duplicate side effects.
            retries: 0,
            data: input.body
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
