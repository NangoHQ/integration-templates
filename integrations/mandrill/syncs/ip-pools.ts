import { createSync } from 'nango';
import { z } from 'zod';

const IpPoolSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.string(),
    ips: z
        .array(
            z.object({
                ip: z.string(),
                created_at: z.string(),
                pool: z.string(),
                domain: z.string(),
                custom_dns: z.object({
                    enabled: z.boolean(),
                    valid: z.boolean(),
                    error: z.string().optional()
                }),
                warmup: z.object({
                    warming_up: z.boolean(),
                    start_at: z.string().optional(),
                    end_at: z.string().optional()
                })
            })
        )
        .optional()
});

const ProviderIpPoolSchema = z.object({
    name: z.string(),
    created_at: z.string(),
    ips: z.array(
        z.object({
            ip: z.string(),
            created_at: z.string(),
            pool: z.string(),
            domain: z.string(),
            custom_dns: z.object({
                enabled: z.boolean(),
                valid: z.boolean(),
                error: z.string().nullable().optional()
            }),
            warmup: z.object({
                warming_up: z.boolean(),
                start_at: z.string().nullable().optional(),
                end_at: z.string().nullable().optional()
            })
        })
    )
});

const sync = createSync({
    description: 'Sync all dedicated IP pools on this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        IpPool: IpPoolSchema
    },

    exec: async (nango) => {
        // Blocker: POST /ips/list-pools returns the full collection in a single
        // call with no pagination parameters and no modified-since/updated-after
        // filter documented. Full refresh is required.
        await nango.trackDeletesStart('IpPool');

        // https://mailchimp.com/developer/transactional/api/ips/list-ip-pools/
        const response = await nango.post({
            endpoint: '/1.0/ips/list-pools.json',
            retries: 3
        });

        const pools = z.array(ProviderIpPoolSchema).safeParse(response.data);

        if (!pools.success) {
            throw new Error(`Failed to parse ip-pools response: ${pools.error.message}`);
        }

        const records = pools.data.map((pool) => ({
            id: pool.name,
            name: pool.name,
            created_at: pool.created_at,
            ips: pool.ips.map((ip) => ({
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
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'IpPool');
        }

        await nango.trackDeletesEnd('IpPool');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
