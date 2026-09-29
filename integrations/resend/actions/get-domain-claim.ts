import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: domains/get-claim
const InputSchema = z.object({ domain_id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        id: z.string().optional(),
        name: z.string().optional(),
        status: z.enum(['pending', 'verified', 'completed', 'blocked', 'expired', 'superseded', 'canceled', 'failed']).optional(),
        domain_id: z.string().nullable().optional(),
        region: z.enum(['us-east-1', 'eu-west-1', 'sa-east-1', 'ap-northeast-1']).nullable().optional(),
        record: z
            .object({ type: z.literal('TXT').optional(), name: z.string().optional(), value: z.string().optional(), ttl: z.string().optional() })
            .passthrough()
            .optional(),
        blocked_reason: z.enum(['grace_period', 'recent_owner_activity', 'pending_scheduled_emails']).nullable().optional(),
        failure_reason: z.string().nullable().optional(),
        created_at: z.string().optional(),
        expires_at: z.string().optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Retrieve a domain claim in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/domains/${encodeURIComponent(input['domain_id'])}/claim`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
