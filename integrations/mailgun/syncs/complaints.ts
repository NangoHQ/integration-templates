import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ComplaintSchema = z
    .object({
        id: z
            .string()
            .describe(
                "Stable record id scoped by domain in the form '{domain}/{address}'. The same address can be suppressed on multiple domains, so the domain prefix keeps ids unique."
            ),
        domain: z.string().describe('Mailgun domain this spam-complaint suppression belongs to (e.g. mg.example.com or a sandbox domain).'),
        address: z.string().describe('Email address that filed the spam complaint. Delivery to this address is suppressed for the domain.'),
        created_at: z
            .string()
            .optional()
            .describe(
                "When the complaint was recorded, in Mailgun's RFC 2822 timestamp format (e.g. 'Tue, 12 Aug 2025 20:00:06 UTC'). Omitted when Mailgun returns none."
            )
    })
    .describe('A Mailgun spam-complaint suppression entry for a single email address on a single domain.');

// Internal parse-only schemas for provider payloads; not part of the public model.
const DomainSchema = z.object({
    name: z.string()
});

const ComplaintItemSchema = z.object({
    address: z.string(),
    created_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync spam-complaint suppression entries, fanned out across all Mailgun domains on the connection',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Complaint: ComplaintSchema
    },

    exec: async (nango) => {
        // Full refresh with deletion detection: the complaints endpoint has no changed-since
        // filter, so every run re-walks every domain's full complaint list (batchSave upserts
        // by id, so this is safe) and trackDeletesStart/trackDeletesEnd detects suppressions
        // removed via delete-complaint.
        const domainsConfig: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domains/get-v3-domains
            endpoint: '/v3/domains',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 1000,
                response_path: 'items'
            },
            retries: 3
        };

        // Prerequisite: enumerate every domain before opening the delete-tracking window, so a
        // failure here cannot cause trackDeletesEnd to falsely mark complaints as deleted.
        const domains: z.infer<typeof DomainSchema>[] = [];
        for await (const page of nango.paginate<unknown>(domainsConfig)) {
            domains.push(...z.array(DomainSchema).parse(page));
        }

        await nango.trackDeletesStart('Complaint');

        for (const domain of domains) {
            const complaintsConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/complaints/get-v3--domainid--complaints
                endpoint: `/v3/${encodeURIComponent(domain.name)}/complaints`,
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'paging.next',
                    response_path: 'items',
                    limit_name_in_request: 'limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate<unknown>(complaintsConfig)) {
                const complaints = z.array(ComplaintItemSchema).parse(page);

                const records: z.infer<typeof ComplaintSchema>[] = complaints.map((complaint) => ({
                    id: `${domain.name}/${complaint.address}`,
                    domain: domain.name,
                    address: complaint.address,
                    ...(complaint.created_at !== undefined && { created_at: complaint.created_at })
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'Complaint');
                }

                // Mailgun never ends the paging.next chain: past the last record it returns an
                // empty page whose next link wraps back to page 1, which would loop forever.
                // A short page is always the final one (an exact-fit last page is followed by
                // an empty page), so stop before following the wrap-around link.
                if (complaints.length < 100) {
                    break;
                }
            }
        }

        // Closed once every domain has been fully scanned, so a suppression entry on a
        // not-yet-processed domain is never falsely marked as deleted.
        await nango.trackDeletesEnd('Complaint');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
