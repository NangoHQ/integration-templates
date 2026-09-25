import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: domains/create-claim
const InputSchema = z
    .object({
        body: z
            .object({
                name: z.string(),
                region: z.enum(['us-east-1', 'eu-west-1', 'sa-east-1', 'ap-northeast-1']).optional(),
                custom_return_path: z.string().optional(),
                open_tracking: z.boolean().optional(),
                click_tracking: z.boolean().optional(),
                tracking_subdomain: z.string().optional()
            })
            .passthrough()
    })
    .passthrough();

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
    description: 'Claim a domain in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/domains/claim`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Retrying a non-idempotent POST can duplicate side effects.
            retries: 0,
            data: input.body
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
