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

const sync = createSync({
    description: 'Sync domain-wide unsubscribe suppression entries, fanned out across all Mailgun domains',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Unsubscribe: UnsubscribeSchema
    },

    exec: async (nango) => {
        // Full refresh with deletion detection: the unsubscribes endpoint has no changed-since
        // filter, so every run re-walks every domain's full unsubscribe list (batchSave upserts
        // by id, so this is safe) and trackDeletesStart/trackDeletesEnd detects suppressions
        // removed via delete-unsubscribe.
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

        // Prerequisite: enumerate every domain before opening the delete-tracking window, so a
        // failure here cannot cause trackDeletesEnd to falsely mark unsubscribes as deleted.
        const domains: z.infer<typeof MailgunDomainSchema>[] = [];
        for await (const domainsPage of nango.paginate<unknown>(domainsConfig)) {
            domains.push(...z.array(MailgunDomainSchema).parse(domainsPage));
        }

        await nango.trackDeletesStart('Unsubscribe');

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

                const records: z.infer<typeof UnsubscribeSchema>[] = items.map((item) => ({
                    id: `${domain.name}/${item.address}`,
                    address: item.address,
                    domain: domain.name,
                    tags: item.tags ?? ['*'],
                    created_at: item.created_at
                }));

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

        // Closed once every domain has been fully scanned, so a suppression entry on a
        // not-yet-processed domain is never falsely marked as deleted.
        await nango.trackDeletesEnd('Unsubscribe');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
