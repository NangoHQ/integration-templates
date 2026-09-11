import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: emails/get
const InputSchema = z.object({ email_id: z.string() });

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        id: z.string().optional(),
        message_id: z.string().optional(),
        to: z.array(z.string()).optional(),
        from: z.string().optional(),
        created_at: z.string().optional(),
        subject: z.string().optional(),
        html: z.string().optional(),
        text: z.string().optional(),
        bcc: z.array(z.string()).optional(),
        cc: z.array(z.string()).optional(),
        reply_to: z.array(z.string()).optional(),
        last_event: z
            .enum([
                'bounced',
                'canceled',
                'clicked',
                'complained',
                'delivered',
                'delivery_delayed',
                'failed',
                'opened',
                'queued',
                'scheduled',
                'sent',
                'suppressed'
            ])
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get email in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/emails/${encodeURIComponent(input['email_id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
