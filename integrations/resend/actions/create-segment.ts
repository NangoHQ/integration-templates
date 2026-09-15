import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: segments/create
const InputSchema = z
    .object({
        body: z
            .object({
                name: z.string(),
                audience_id: z.string().optional().describe('Deprecated audience to attach the segment to. Example: "78261eea-8f8b-4381-83c6-79fa7120f1cf"'),
                filter: z.object({}).passthrough().optional()
            })
            .passthrough()
    })
    .passthrough();

const ProviderResponseSchema = z.object({ id: z.string().optional(), object: z.string().optional() }).passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Create a new segment in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/segments`,
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
