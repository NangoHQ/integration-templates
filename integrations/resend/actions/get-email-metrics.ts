import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: emails/metrics
const InputSchema = z
    .object({
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        timezone: z.string().optional(),
        granularity: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
        metrics: z
            .array(
                z.enum([
                    'received',
                    'delivered',
                    'complained',
                    'suppressed',
                    'bounced',
                    'bounced_transient',
                    'bounced_permanent',
                    'bounced_undetermined',
                    'opened',
                    'clicked',
                    'unsubscribed',
                    'delivery_delayed',
                    'failed',
                    'sent',
                    'unique_opened',
                    'unique_clicked',
                    'delivery_rate',
                    'open_rate',
                    'click_rate',
                    'bounce_rate',
                    'complaint_rate',
                    'unsubscribe_rate'
                ])
            )
            .optional(),
        dimensions: z.array(z.enum(['period', 'domain', 'email', 'broadcast'])).optional(),
        domain_id: z.array(z.string()).optional(),
        email_id: z.array(z.string()).optional(),
        broadcast_id: z.array(z.string()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        object: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        metrics: z.array(z.string()).optional(),
        dimensions: z.array(z.enum(['period', 'domain', 'email', 'broadcast'])).optional(),
        granularity: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
        totals: z.record(z.string(), z.number()).optional(),
        data: z
            .array(
                z
                    .object({
                        period: z.string().optional(),
                        domain_id: z.string().optional(),
                        domain_name: z.string().optional(),
                        email_id: z.string().optional(),
                        broadcast_id: z.string().optional(),
                        broadcast_name: z.string().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Retrieve account-level email metrics in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input['start_date'] !== undefined)
            params['start_date'] = Array.isArray(input['start_date']) ? input['start_date'].join(',') : String(input['start_date']);
        if (input['end_date'] !== undefined) params['end_date'] = Array.isArray(input['end_date']) ? input['end_date'].join(',') : String(input['end_date']);
        if (input['timezone'] !== undefined) params['timezone'] = Array.isArray(input['timezone']) ? input['timezone'].join(',') : String(input['timezone']);
        if (input['granularity'] !== undefined)
            params['granularity'] = Array.isArray(input['granularity']) ? input['granularity'].join(',') : String(input['granularity']);
        if (input['metrics'] !== undefined) params['metrics'] = Array.isArray(input['metrics']) ? input['metrics'].join(',') : String(input['metrics']);
        if (input['dimensions'] !== undefined)
            params['dimensions'] = Array.isArray(input['dimensions']) ? input['dimensions'].join(',') : String(input['dimensions']);
        if (input['domain_id'] !== undefined)
            params['domain_id'] = Array.isArray(input['domain_id']) ? input['domain_id'].join(',') : String(input['domain_id']);
        if (input['email_id'] !== undefined) params['email_id'] = Array.isArray(input['email_id']) ? input['email_id'].join(',') : String(input['email_id']);
        if (input['broadcast_id'] !== undefined)
            params['broadcast_id'] = Array.isArray(input['broadcast_id']) ? input['broadcast_id'].join(',') : String(input['broadcast_id']);
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/emails/metrics`,
            retries: 3,
            params
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
