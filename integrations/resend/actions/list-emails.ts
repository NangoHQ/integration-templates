import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: emails/list
const InputSchema = z
    .object({ limit: z.number().int().min(1).max(100).optional(), after: z.string().optional(), before: z.string().optional() })
    .refine((input) => input.after === undefined || input.before === undefined, { message: 'Use either after or before, not both' });

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        has_more: z.boolean().optional(),
        data: z
            .array(
                z
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
                    .passthrough()
            )
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema.extend({ next_cursor: z.string().optional() });

const action = createAction({
    description: 'List emails in Resend. Returns one page; pass next_cursor as after to continue.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input['limit'] !== undefined) params['limit'] = input['limit'];
        if (input['after'] !== undefined) params['after'] = input['after'];
        if (input['before'] !== undefined) params['before'] = input['before'];
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/emails`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return { ...data, next_cursor: data.has_more ? data.data?.at(-1)?.id : undefined };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
