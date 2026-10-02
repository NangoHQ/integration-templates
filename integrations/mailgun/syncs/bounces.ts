import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BounceSchema = z
    .object({
        id: z
            .string()
            .describe(
                'Unique identifier for the bounce suppression, composed as `{domain}/{address}` because the same address can be suppressed on multiple domains.'
            ),
        domain: z.string().describe('The Mailgun sending domain this bounce suppression belongs to, e.g. "mg.example.com".'),
        address: z.string().describe('The recipient email address that hard-bounced and is now suppressed from further sending.'),
        code: z.string().optional().describe('The SMTP error code returned by the recipient mail server, e.g. "550".'),
        error: z
            .string()
            .optional()
            .describe(
                'The human-readable error message returned by the recipient mail server, e.g. "5.1.1 The email account that you tried to reach does not exist".'
            ),
        created_at: z.string().describe('When Mailgun recorded the bounce, in RFC 2822 format, e.g. "Fri, 02 Oct 2026 00:31:24 UTC".')
    })
    .describe('A Mailgun hard-bounce suppression entry for a single recipient address on a single sending domain.');

const DomainRecordSchema = z.object({
    name: z.string()
});

const BounceRecordSchema = z.object({
    address: z.string(),
    code: z.union([z.string(), z.number()]).nullish(),
    error: z.string().nullish(),
    created_at: z.string()
});

const sync = createSync({
    description: 'Sync hard-bounce suppression entries, fanned out across all domains on the Mailgun account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Bounce: BounceSchema
    },

    exec: async (nango) => {
        // Full refresh with deletion detection, fanned out across every domain: each domain's
        // bounce list is its own independent stream (no account-wide ordering), so an
        // account-wide "latest seen" checkpoint could skip a domain's genuinely new bounces
        // whenever another domain had already advanced further. Every run re-walks every
        // domain's full bounce list (batchSave upserts by id, so this is safe) and
        // trackDeletesStart/trackDeletesEnd detects suppressions removed via delete-bounce.

        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domains
        const domainsConfig: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domains
            endpoint: '/v3/domains',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'items'
            },
            retries: 3
        };

        // Prerequisite: enumerate every domain before opening the delete-tracking window, so a
        // failure here cannot cause trackDeletesEnd to falsely mark bounces as deleted.
        const domains: z.infer<typeof DomainRecordSchema>[] = [];
        for await (const rawDomains of nango.paginate<unknown>(domainsConfig)) {
            domains.push(...z.array(DomainRecordSchema).parse(rawDomains));
        }

        await nango.trackDeletesStart('Bounce');

        for (const domain of domains) {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/bounces/get-v3--domainid--bounces
            const bouncesConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/bounces/get-v3--domainid--bounces
                endpoint: `/v3/${encodeURIComponent(domain.name)}/bounces`,
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'paging.next',
                    limit_name_in_request: 'limit',
                    limit: 100,
                    response_path: 'items'
                },
                retries: 3
            };

            for await (const rawBounces of nango.paginate<unknown>(bouncesConfig)) {
                const bounces = z.array(BounceRecordSchema).parse(rawBounces);
                if (bounces.length === 0) {
                    break;
                }

                const records: z.infer<typeof BounceSchema>[] = bounces.map((bounce) => ({
                    id: `${domain.name}/${bounce.address}`,
                    domain: domain.name,
                    address: bounce.address,
                    ...(bounce.code != null && { code: String(bounce.code) }),
                    ...(bounce.error != null && { error: bounce.error }),
                    created_at: bounce.created_at
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'Bounce');
                }
            }
        }

        // Closed once every domain has been fully scanned, so a suppression entry on a
        // not-yet-processed domain is never falsely marked as deleted.
        await nango.trackDeletesEnd('Bounce');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
