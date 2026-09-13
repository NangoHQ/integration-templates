import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: domains/create
const InputSchema = z.object({
    body: z.object({
        name: z.string(),
        region: z.enum(['us-east-1', 'eu-west-1', 'sa-east-1', 'ap-northeast-1']).optional(),
        custom_return_path: z.string().optional(),
        open_tracking: z.boolean().optional(),
        click_tracking: z.boolean().optional(),
        tls: z.enum(['opportunistic', 'enforced']).optional(),
        capabilities: z.object({ sending: z.enum(['enabled', 'disabled']).optional(), receiving: z.enum(['enabled', 'disabled']).optional() }).optional(),
        tracking_subdomain: z.string().optional()
    })
});

const ProviderResponseSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        created_at: z.string().optional(),
        status: z.enum(['pending', 'verified', 'failed', 'not_started', 'partially_verified', 'partially_failed']).optional(),
        capabilities: z
            .object({ sending: z.enum(['enabled', 'disabled']).optional(), receiving: z.enum(['enabled', 'disabled']).optional() })
            .passthrough()
            .optional(),
        records: z
            .array(
                z
                    .object({
                        record: z.enum(['SPF', 'DKIM', 'Receiving', 'Tracking', 'TrackingCAA']).optional(),
                        name: z.string().optional(),
                        type: z.enum(['MX', 'TXT', 'CNAME', 'CAA']).optional(),
                        ttl: z.string().optional(),
                        status: z.enum(['pending', 'verified', 'failed', 'temporary_failure', 'not_started']).optional(),
                        value: z.string().optional(),
                        priority: z.number().int().optional()
                    })
                    .passthrough()
            )
            .optional(),
        region: z.string().optional(),
        open_tracking: z.boolean().optional(),
        click_tracking: z.boolean().optional(),
        tracking_subdomain: z.string().optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Create domain in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/domains`,
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
