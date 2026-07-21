import { createSync } from 'nango';
import { z } from 'zod';

const CustomDnsSchema = z.object({
    enabled: z.boolean(),
    valid: z.boolean(),
    error: z.string().nullable().optional()
});

const WarmupStatusSchema = z.object({
    warming_up: z.boolean(),
    start_at: z.string().nullable().optional(),
    end_at: z.string().nullable().optional()
});

const ProviderIpSchema = z.object({
    ip: z.string(),
    created_at: z.string(),
    pool: z.string(),
    domain: z.string(),
    custom_dns: CustomDnsSchema,
    warmup: WarmupStatusSchema
});

const DedicatedIpSchema = z.object({
    id: z.string(),
    ip: z.string(),
    created_at: z.string(),
    pool: z.string(),
    domain: z.string(),
    custom_dns: CustomDnsSchema,
    warmup: WarmupStatusSchema
});

const sync = createSync({
    description: 'Sync all dedicated IPs on this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        DedicatedIp: DedicatedIpSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('DedicatedIp');

        // https://mailchimp.com/developer/transactional/api/ips/
        const response = await nango.post({
            endpoint: '1.0/ips/list.json',
            data: {},
            retries: 3
        });

        const parsed = z.array(ProviderIpSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse dedicated IPs response: ${parsed.error.message}`);
        }

        const ips = parsed.data.map((ip) => ({
            id: ip.ip,
            ip: ip.ip,
            created_at: ip.created_at,
            pool: ip.pool,
            domain: ip.domain,
            custom_dns: ip.custom_dns,
            warmup: ip.warmup
        }));

        if (ips.length > 0) {
            await nango.batchSave(ips, 'DedicatedIp');
        }

        await nango.trackDeletesEnd('DedicatedIp');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
