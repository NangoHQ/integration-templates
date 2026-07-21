import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pool: z.string().describe('The name of the dedicated IP pool. Example: "Main Pool"')
});

const ProviderCustomDnsSchema = z.object({
    enabled: z.boolean(),
    valid: z.boolean(),
    error: z.string().nullable().optional()
});

const ProviderWarmupStatusSchema = z.object({
    warming_up: z.boolean(),
    start_at: z.string().nullable().optional(),
    end_at: z.string().nullable().optional()
});

const ProviderIpSchema = z.object({
    ip: z.string(),
    created_at: z.string(),
    pool: z.string(),
    domain: z.string(),
    custom_dns: ProviderCustomDnsSchema,
    warmup: ProviderWarmupStatusSchema
});

const ProviderPoolSchema = z.object({
    name: z.string(),
    created_at: z.string(),
    ips: z.array(ProviderIpSchema)
});

const OutputCustomDnsSchema = z.object({
    enabled: z.boolean(),
    valid: z.boolean(),
    error: z.string().optional()
});

const OutputWarmupStatusSchema = z.object({
    warming_up: z.boolean(),
    start_at: z.string().optional(),
    end_at: z.string().optional()
});

const OutputIpSchema = z.object({
    ip: z.string(),
    created_at: z.string(),
    pool: z.string(),
    domain: z.string(),
    custom_dns: OutputCustomDnsSchema,
    warmup: OutputWarmupStatusSchema
});

const OutputSchema = z.object({
    name: z.string(),
    created_at: z.string(),
    ips: z.array(OutputIpSchema)
});

const action = createAction({
    description: 'Get information about a single dedicated IP pool.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/ips/get-ip-pool-info/
            endpoint: 'ips/pool-info',
            data: {
                pool: input.pool
            },
            retries: 3,
            baseUrlOverride: 'https://mandrillapp.com/api/1.0'
        });

        const providerPool = ProviderPoolSchema.parse(response.data);

        return {
            name: providerPool.name,
            created_at: providerPool.created_at,
            ips: providerPool.ips.map((ip) => ({
                ip: ip.ip,
                created_at: ip.created_at,
                pool: ip.pool,
                domain: ip.domain,
                custom_dns: {
                    enabled: ip.custom_dns.enabled,
                    valid: ip.custom_dns.valid,
                    ...(ip.custom_dns.error != null && { error: ip.custom_dns.error })
                },
                warmup: {
                    warming_up: ip.warmup.warming_up,
                    ...(ip.warmup.start_at != null && { start_at: ip.warmup.start_at }),
                    ...(ip.warmup.end_at != null && { end_at: ip.warmup.end_at })
                }
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
