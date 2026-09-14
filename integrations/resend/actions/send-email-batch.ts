import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: emails/send-batch
const InputSchema = z
    .object({
        idempotency_key: z.string().max(256).optional(),
        body: z.array(
            z
                .object({
                    from: z.string(),
                    to: z.union([z.string(), z.array(z.string()).min(1).max(50)]),
                    subject: z.string(),
                    bcc: z.union([z.string(), z.array(z.string())]).optional(),
                    cc: z.union([z.string(), z.array(z.string())]).optional(),
                    reply_to: z.union([z.string(), z.array(z.string())]).optional(),
                    html: z.string().optional(),
                    text: z.string().optional(),
                    template: z
                        .object({ id: z.string(), variables: z.record(z.string(), z.union([z.string(), z.number()])).optional() })
                        .passthrough()
                        .optional(),
                    headers: z.object({}).passthrough().optional(),
                    scheduled_at: z.string().optional(),
                    attachments: z
                        .array(
                            z
                                .object({
                                    content: z.string().optional(),
                                    filename: z.string().optional(),
                                    path: z.string().optional(),
                                    content_type: z.string().optional(),
                                    content_id: z.string().optional()
                                })
                                .passthrough()
                        )
                        .optional(),
                    tags: z.array(z.object({ name: z.string().optional(), value: z.string().optional() }).passthrough()).optional(),
                    topic_id: z.string().optional()
                })
                .passthrough()
        )
    })
    .passthrough();

const ProviderResponseSchema = z.object({ data: z.array(z.object({ id: z.string().optional() }).passthrough()).optional() }).passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Trigger up to 100 batch emails at once in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const headers: Record<string, string> = {};
        if (input['idempotency_key'] !== undefined) headers['Idempotency-Key'] = String(input['idempotency_key']);
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/emails/batch`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Retrying a non-idempotent POST can duplicate side effects.
            retries: input['idempotency_key'] ? 3 : 0,
            headers,
            data: input.body
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
