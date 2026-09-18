import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: webhooks/get
const InputSchema = z.object({ webhook_id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        id: z.string().optional(),
        endpoint: z.string().optional(),
        events: z.array(z.string()).nullable().optional(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        signing_secret: z.string().optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Retrieve a single webhook in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/webhooks/${encodeURIComponent(input['webhook_id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
