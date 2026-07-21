import { createSync } from 'nango';
import { z } from 'zod';

const ProviderTrackingDomainSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    last_tested_at: z.string().optional(),
    cname: z
        .object({
            valid: z.boolean().optional(),
            valid_after: z.string().nullable().optional(),
            error: z.string().nullable().optional()
        })
        .optional(),
    valid_tracking: z.boolean().optional()
});

const TrackingDomainSchema = z.object({
    id: z.string(),
    domain: z.string(),
    created_at: z.string().optional(),
    last_tested_at: z.string().optional(),
    valid_tracking: z.boolean().optional(),
    cname_valid: z.boolean().optional(),
    cname_valid_after: z.string().optional(),
    cname_error: z.string().optional()
});

const sync = createSync({
    description: 'Sync all click/open-tracking domains configured on this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        TrackingDomain: TrackingDomainSchema
    },

    exec: async (nango) => {
        // https://mailchimp.com/developer/transactional/api/urls/tracking-domains/
        const response = await nango.post({
            endpoint: '1.3/urls/tracking-domains',
            retries: 3
        });

        const parsed = z.array(ProviderTrackingDomainSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse tracking domains: ${parsed.error.message}`);
        }

        const domains = parsed.data.map((item) => ({
            id: item.domain,
            domain: item.domain,
            ...(item.created_at != null && { created_at: item.created_at }),
            ...(item.last_tested_at != null && { last_tested_at: item.last_tested_at }),
            ...(item.valid_tracking != null && { valid_tracking: item.valid_tracking }),
            ...(item.cname?.valid != null && { cname_valid: item.cname.valid }),
            ...(item.cname?.valid_after != null && { cname_valid_after: item.cname.valid_after }),
            ...(item.cname?.error != null && { cname_error: item.cname.error })
        }));

        await nango.trackDeletesStart('TrackingDomain');
        if (domains.length > 0) {
            await nango.batchSave(domains, 'TrackingDomain');
        }
        await nango.trackDeletesEnd('TrackingDomain');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
