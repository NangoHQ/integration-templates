import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UnsubscribeSchema = z
    .object({
        id: z
            .string()
            .describe(
                'Stable record id scoped to the sending domain, formatted as `{domain}/{address}` (e.g. `mg.example.com/user@example.com`). The same address can be unsubscribed in multiple domains, so the domain is part of the id.'
            ),
        address: z.string().describe('Email address that is suppressed from receiving email, e.g. `user@example.com`'),
        domain: z.string().describe('Sending domain this unsubscribe entry belongs to, e.g. `mg.example.com`'),
        tags: z
            .array(z.string())
            .describe('Tags the unsubscribe applies to. The default `["*"]` means the address is unsubscribed from all tags/campaigns of the domain.'),
        created_at: z.string().describe('RFC 2822 timestamp of when the address was unsubscribed, e.g. `Fri, 02 Oct 2026 01:07:33 UTC`')
    })
    .describe('A Mailgun unsubscribe suppression entry for a sending domain');

const CheckpointSchema = z.object({
    created_after: z
        .string()
        .describe('ISO 8601 high-water mark of the newest unsubscribe entry synced by the previous run; strictly older entries are skipped on the next run')
});

// Internal schemas used only to parse provider responses.
const MailgunDomainSchema = z.object({
    name: z.string()
});

const MailgunUnsubscribesPageSchema = z.object({
    items: z.array(
        z.object({
            address: z.string(),
            tags: z.array(z.string()).optional(),
            created_at: z.string()
        })
    )
});

const PAGE_LIMIT = 100;

function parseCheckpointMs(createdAfter: string | undefined): number | undefined {
    if (!createdAfter) {
        return undefined;
    }
    const ms = Date.parse(createdAfter);
    // A corrupt checkpoint must not crash the run; fall back to a full re-walk.
    return Number.isNaN(ms) ? undefined : ms;
}

const sync = createSync({
    description: 'Sync domain-wide unsubscribe suppression entries, fanned out across all Mailgun domains',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Unsubscribe: UnsubscribeSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const checkpointMs = parseCheckpointMs(checkpoint?.created_after);
        let newestMs = checkpointMs;

        const domainsConfig: ProxyConfiguration = {
            // https://documentation.mailgun.com/ — GET /v3/domains (list domains)
            endpoint: '/v3/domains',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: PAGE_LIMIT,
                response_path: 'items'
            },
            retries: 3
        };

        for await (const domainsPage of nango.paginate<unknown>(domainsConfig)) {
            const domains = z.array(MailgunDomainSchema).parse(domainsPage);

            for (const domain of domains) {
                // Mailgun paginates suppressions with address-keyed `paging` URLs whose `next`
                // link never disappears (the final page points back at the plain endpoint), so
                // nango.paginate link mode would loop forever. Pages are walked manually
                // instead: request `page=next&address=<last address seen>` until a short page
                // (< limit) comes back.
                let cursor: string | undefined;
                let hasMore = true;
                while (hasMore) {
                    // https://documentation.mailgun.com/ — GET /v3/{domain}/unsubscribes (list unsubscribe suppression entries)
                    const response = await nango.get({
                        endpoint: `/v3/${encodeURIComponent(domain.name)}/unsubscribes`,
                        params: {
                            limit: PAGE_LIMIT,
                            ...(cursor ? { page: 'next', address: cursor } : {})
                        },
                        retries: 3
                    });
                    const { items } = MailgunUnsubscribesPageSchema.parse(response.data);

                    const records: z.infer<typeof UnsubscribeSchema>[] = [];
                    for (const item of items) {
                        const createdMs = Date.parse(item.created_at);
                        if (Number.isNaN(createdMs)) {
                            throw new Error(`Mailgun unsubscribe entry ${item.address} has an unparseable created_at: ${item.created_at}`);
                        }
                        if (newestMs === undefined || createdMs > newestMs) {
                            newestMs = createdMs;
                        }
                        // Skip entries already synced by a previous run. Entries at the exact
                        // watermark are re-saved (idempotent upsert) so an entry created in the
                        // same second as the watermark is never missed after a crash.
                        if (checkpointMs !== undefined && createdMs < checkpointMs) {
                            continue;
                        }
                        records.push({
                            id: `${domain.name}/${item.address}`,
                            address: item.address,
                            domain: domain.name,
                            tags: item.tags ?? ['*'],
                            created_at: item.created_at
                        });
                    }

                    if (records.length > 0) {
                        await nango.batchSave(records, 'Unsubscribe');
                    }

                    const lastItem = items[items.length - 1];
                    if (items.length < PAGE_LIMIT || !lastItem) {
                        hasMore = false;
                    } else {
                        cursor = lastItem.address;
                    }
                }
            }
        }

        // Persist the high-water mark only once every domain has been fully walked. Pages are
        // ordered by address, not by created_at, so a mid-run checkpoint could permanently skip
        // never-saved entries of unprocessed domains after a crash; a full re-walk is safe
        // because batchSave upserts by id.
        if (newestMs !== undefined && (checkpointMs === undefined || newestMs > checkpointMs)) {
            await nango.saveCheckpoint({
                created_after: new Date(newestMs).toISOString()
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
