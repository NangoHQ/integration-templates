import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: contacts/update-topics
const InputSchema = z
    .object({
        contact_id: z.string(),
        body: z
            .object({ topics: z.array(z.object({ id: z.string().optional(), subscription: z.enum(['opt_in', 'opt_out']).optional() }).passthrough()) })
            .passthrough()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        contact_id: z.string().optional(),
        topics: z.array(z.object({ id: z.string().optional(), subscription: z.enum(['opt_in', 'opt_out']).optional() }).passthrough()).optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Update topics for a contact in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/contacts/${encodeURIComponent(input['contact_id'])}/topics`,
            retries: 3,
            data: input.body
        };
        const response = await nango.patch(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
