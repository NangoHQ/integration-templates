import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: emails/get-receiving-attachment
const InputSchema = z.object({ email_id: z.string(), attachment_id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        id: z.string().optional(),
        filename: z.string().nullable().optional(),
        content_type: z.string().optional(),
        content_id: z.string().optional(),
        content_disposition: z.enum(['inline', 'attachment']).nullable().optional(),
        download_url: z.string().optional(),
        expires_at: z.string().optional(),
        size: z.number().int().optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Retrieve a single attachment for a received email in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/emails/receiving/${encodeURIComponent(input['email_id'])}/attachments/${encodeURIComponent(input['attachment_id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
