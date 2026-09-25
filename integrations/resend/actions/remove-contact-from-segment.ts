import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: contacts/remove-segment
const InputSchema = z.object({ contact_id: z.string(), segment_id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({ object: z.string().optional(), contact_id: z.string().optional(), segment_id: z.string().optional(), deleted: z.boolean().optional() })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Remove a contact from a segment in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/contacts/${encodeURIComponent(input['contact_id'])}/segments/${encodeURIComponent(input['segment_id'])}`,
            retries: 3
        };
        const response = await nango.delete(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
