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

const CheckpointSchema = z.object({
    latest_created_at: z
        .string()
        .describe(
            'ISO 8601 timestamp of the most recent bounce seen by the previous run. Records created at or before this time were already synced and are skipped.'
        )
});

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
    checkpoint: CheckpointSchema,
    models: {
        Bounce: BounceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const checkpointMs = checkpoint?.latest_created_at ? Date.parse(checkpoint.latest_created_at) : undefined;
        let maxCreatedAtMs: number | undefined;

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

        for await (const rawDomains of nango.paginate<unknown>(domainsConfig)) {
            const domains = z.array(DomainRecordSchema).parse(rawDomains);

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

                    const records: z.infer<typeof BounceSchema>[] = [];
                    for (const bounce of bounces) {
                        const createdAtMs = Date.parse(bounce.created_at);
                        if (checkpointMs !== undefined && !Number.isNaN(createdAtMs) && createdAtMs <= checkpointMs) {
                            continue;
                        }
                        if (!Number.isNaN(createdAtMs) && (maxCreatedAtMs === undefined || createdAtMs > maxCreatedAtMs)) {
                            maxCreatedAtMs = createdAtMs;
                        }
                        records.push({
                            id: `${domain.name}/${bounce.address}`,
                            domain: domain.name,
                            address: bounce.address,
                            ...(bounce.code != null && { code: String(bounce.code) }),
                            ...(bounce.error != null && { error: bounce.error }),
                            created_at: bounce.created_at
                        });
                    }

                    if (records.length > 0) {
                        await nango.batchSave(records, 'Bounce');
                    }
                }
            }
        }

        // Saved once after every domain has been fully scanned: a mid-scan checkpoint
        // could make a crashed run permanently skip unsynced bounces on later domains.
        if (maxCreatedAtMs !== undefined) {
            await nango.saveCheckpoint({ latest_created_at: new Date(maxCreatedAtMs).toISOString() });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
