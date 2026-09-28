import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: domains/get
const InputSchema = z.object({ domain_id: z.string() });

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        id: z.string().optional(),
        name: z.string().optional(),
        status: z.enum(['pending', 'verified', 'failed', 'not_started', 'partially_verified', 'partially_failed']).optional(),
        created_at: z.string().optional(),
        region: z.string().optional(),
        open_tracking: z.boolean().optional(),
        click_tracking: z.boolean().optional(),
        tracking_subdomain: z.string().optional(),
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
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get domain in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/domains/${encodeURIComponent(input['domain_id'])}`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
