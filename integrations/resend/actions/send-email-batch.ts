import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: emails/send-batch
const BatchEmailSchema = z
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
        tags: z.array(z.object({ name: z.string(), value: z.string() }).passthrough()).optional(),
        topic_id: z.string().optional()
    })
    .passthrough()
    .refine((email) => (email.template ? email.html === undefined && email.text === undefined : Boolean(email.html || email.text)), {
        message: 'Provide html or text, or a template without html/text'
    });

const InputSchema = z
    .object({
        idempotency_key: z.string().max(256).optional(),
        body: z.array(BatchEmailSchema).min(1).max(100)
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
        if (input.idempotency_key !== undefined) {
            const keyedConfig: ProxyConfiguration = {
                // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
                endpoint: `/emails/batch`,
                retries: 3,
                headers: { 'Idempotency-Key': input.idempotency_key },
                data: input.body
            };
            const response = await nango.post(keyedConfig);
            return ProviderResponseSchema.parse(response.data);
        }
        const unkeyedConfig: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/emails/batch`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Without an idempotency key a retried batch can deliver the emails twice.
            retries: 0,
            data: input.body
        };
        const response = await nango.post(unkeyedConfig);
        return ProviderResponseSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
