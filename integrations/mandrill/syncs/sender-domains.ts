import { createSync } from 'nango';
import { z } from 'zod';

const ProviderSenderDomainSchema = z.object({
    domain: z.string(),
    created_at: z.string().nullish(),
    last_tested_at: z.string().nullish(),
    spf: z
        .object({
            valid: z.boolean().nullish(),
            valid_after: z.string().nullish(),
            error: z.string().nullish()
        })
        .nullish(),
    dkim: z
        .object({
            valid: z.boolean().nullish(),
            valid_after: z.string().nullish(),
            error: z.string().nullish()
        })
        .nullish(),
    verified_at: z.string().nullish(),
    valid_signing: z.boolean().nullish()
});

const SenderDomainSchema = z.object({
    id: z.string(),
    domain: z.string(),
    created_at: z.string().optional(),
    last_tested_at: z.string().optional(),
    spf: z
        .object({
            valid: z.boolean().optional(),
            valid_after: z.string().optional(),
            error: z.string().optional()
        })
        .optional(),
    dkim: z
        .object({
            valid: z.boolean().optional(),
            valid_after: z.string().optional(),
            error: z.string().optional()
        })
        .optional(),
    verified_at: z.string().optional(),
    valid_signing: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync sender domains added to the account for SPF/DKIM verification.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        SenderDomain: SenderDomainSchema
    },

    exec: async (nango) => {
        // Blocker: POST /senders/domains accepts no params and returns the full collection
        // in a single call with no pagination and no modified-since filter documented.
        await nango.trackDeletesStart('SenderDomain');

        // https://mailchimp.com/developer/transactional/api/senders/list-sender-domains/
        const response = await nango.post({
            endpoint: '/1.0/senders/domains',
            data: {},
            retries: 3
        });

        const rawDomains = z.array(z.unknown()).safeParse(response.data);
        if (!rawDomains.success) {
            throw new Error(`Unexpected response from /senders/domains: ${rawDomains.error.message}`);
        }

        const domains = [];
        for (const item of rawDomains.data) {
            const parsed = ProviderSenderDomainSchema.safeParse(item);
            if (!parsed.success) {
                throw new Error(`Invalid sender domain record: ${parsed.error.message}`);
            }

            domains.push({
                id: parsed.data.domain,
                domain: parsed.data.domain,
                ...(parsed.data.created_at != null && { created_at: parsed.data.created_at }),
                ...(parsed.data.last_tested_at != null && { last_tested_at: parsed.data.last_tested_at }),
                ...(parsed.data.spf != null && {
                    spf: {
                        ...(parsed.data.spf.valid != null && { valid: parsed.data.spf.valid }),
                        ...(parsed.data.spf.valid_after != null && { valid_after: parsed.data.spf.valid_after }),
                        ...(parsed.data.spf.error != null && { error: parsed.data.spf.error })
                    }
                }),
                ...(parsed.data.dkim != null && {
                    dkim: {
                        ...(parsed.data.dkim.valid != null && { valid: parsed.data.dkim.valid }),
                        ...(parsed.data.dkim.valid_after != null && { valid_after: parsed.data.dkim.valid_after }),
                        ...(parsed.data.dkim.error != null && { error: parsed.data.dkim.error })
                    }
                }),
                ...(parsed.data.verified_at != null && { verified_at: parsed.data.verified_at }),
                ...(parsed.data.valid_signing != null && { valid_signing: parsed.data.valid_signing })
            });
        }

        if (domains.length > 0) {
            await nango.batchSave(domains, 'SenderDomain');
        }

        await nango.trackDeletesEnd('SenderDomain');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
