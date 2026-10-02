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
        created_at: z.string().describe("When the complaint was recorded, in Mailgun's RFC 2822 timestamp format (e.g. 'Tue, 12 Aug 2025 20:00:06 UTC').")
    })
    .describe('A Mailgun spam-complaint suppression entry for a single email address on a single domain.');

const CheckpointSchema = z
    .object({
        created_after: z
            .string()
            .describe(
                'High-water mark: the newest complaint created_at persisted by a completed run. Entries at or before this timestamp are skipped on the next run.'
            )
    })
    .describe('Sync progress for the complaints sync.');

// Internal parse-only schemas for provider payloads; not part of the public model.
const DomainSchema = z.object({
    name: z.string()
});

const ComplaintItemSchema = z.object({
    address: z.string(),
    created_at: z.string()
});

const sync = createSync({
    description: 'Sync spam-complaint suppression entries, fanned out across all Mailgun domains on the connection',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Complaint: ComplaintSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Mailgun timestamps are RFC 2822 (e.g. 'Tue, 12 Aug 2025 20:00:06 UTC'), so compare via epoch millis.
        const parsedCheckpointTime = checkpoint?.created_after ? Date.parse(checkpoint.created_after) : Number.NaN;
        const checkpointTime = Number.isNaN(parsedCheckpointTime) ? undefined : parsedCheckpointTime;

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

        const domains: z.infer<typeof DomainSchema>[] = [];
        for await (const page of nango.paginate<unknown>(domainsConfig)) {
            domains.push(...z.array(DomainSchema).parse(page));
        }

        let maxCreatedAt: string | undefined;
        let maxCreatedAtTime: number | undefined;

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
                const records: z.infer<typeof ComplaintSchema>[] = [];

                for (const complaint of complaints) {
                    const createdAtTime = Date.parse(complaint.created_at);

                    // The complaints endpoint has no date filter, so the checkpoint gates which
                    // entries get saved: anything at or before it was persisted by a prior run.
                    if (checkpointTime !== undefined && !Number.isNaN(createdAtTime) && createdAtTime <= checkpointTime) {
                        continue;
                    }

                    records.push({
                        id: `${domain.name}/${complaint.address}`,
                        domain: domain.name,
                        address: complaint.address,
                        created_at: complaint.created_at
                    });

                    if (!Number.isNaN(createdAtTime) && (maxCreatedAtTime === undefined || createdAtTime > maxCreatedAtTime)) {
                        maxCreatedAt = complaint.created_at;
                        maxCreatedAtTime = createdAtTime;
                    }
                }

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

        // Persisted once after the full walk so a failed run re-walks and re-saves idempotently
        // instead of skipping entries it never persisted.
        if (maxCreatedAt !== undefined) {
            await nango.saveCheckpoint({ created_after: maxCreatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
