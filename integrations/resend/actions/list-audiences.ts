import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: audiences/list
const InputSchema = z.object({}).passthrough();

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        data: z.array(z.object({ id: z.string().optional(), name: z.string().optional(), created_at: z.string().optional() }).passthrough()).optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description:
        'Retrieve a list of audiences in Resend. Deprecated by the provider in favour of Segments: prefer list-segments. The endpoint still works but will be removed in the future.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/audiences`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
