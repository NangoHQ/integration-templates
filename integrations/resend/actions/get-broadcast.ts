import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: broadcasts/get
const InputSchema = z.object({ id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        audience_id: z.string().nullable().optional(),
        segment_id: z.string().nullable().optional(),
        from: z.string().optional(),
        subject: z.string().optional(),
        reply_to: z.array(z.string()).nullable().optional(),
        preview_text: z.string().optional(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        scheduled_at: z.string().nullable().optional(),
        sent_at: z.string().nullable().optional(),
        text: z.string().nullable().optional(),
        html: z.string().nullable().optional(),
        topic_id: z.string().nullable().optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Retrieve a single broadcast in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/broadcasts/${encodeURIComponent(input['id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
