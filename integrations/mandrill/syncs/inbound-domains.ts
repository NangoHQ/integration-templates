import { createSync } from 'nango';
import { z } from 'zod';

const ProviderInboundDomainSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional().nullable(),
    valid_mx: z.boolean().optional().nullable()
});

const InboundDomainSchema = z.object({
    id: z.string(),
    domain: z.string(),
    created_at: z.string().optional(),
    valid_mx: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync all inbound-routing domains configured on this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        InboundDomain: InboundDomainSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes POST /inbound/domains with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. Treat as full-refresh snapshot.
        await nango.trackDeletesStart('InboundDomain');

        // https://mailchimp.com/developer/transactional/api/inbound/list-inbound-domains/
        const response = await nango.post({
            endpoint: '/1.3/inbound/domains',
            retries: 3
        });

        const parsed = z.array(ProviderInboundDomainSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid inbound domains response: ${parsed.error.message}`);
        }

        const domains = parsed.data.map((item) => ({
            id: item.domain,
            domain: item.domain,
            ...(item.created_at != null && { created_at: item.created_at }),
            ...(item.valid_mx != null && { valid_mx: item.valid_mx })
        }));

        if (domains.length > 0) {
            await nango.batchSave(domains, 'InboundDomain');
        }

        await nango.trackDeletesEnd('InboundDomain');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
