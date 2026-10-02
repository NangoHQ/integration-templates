import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

/**
 * Full-refresh sync of Mailgun message templates, fanned out across every domain on the account.
 *
 * Why full refresh: the templates API has no changed-since filter and no deleted-records endpoint,
 * and template updates (PUT) do not bump `createdAt`, so there is no reliable incremental change
 * source. Deletion detection uses trackDeletesStart/trackDeletesEnd: every run walks every domain
 * starting from page 1 (cursors are never restored from the checkpoint), the checkpoint is saved
 * only once the whole scan completes, and the delete window closes exactly once on the success
 * path. The checkpoint's `latestCreatedAt` is therefore a coarse high-water mark only.
 */
const TemplateSchema = z
    .object({
        id: z
            .string()
            .describe(
                'Stable record ID scoped across the domain fan-out: "{domain}/{Mailgun template ID}". Example: "mg.example.com/01a0f9ff-cdfb-764d-97d6-483199890cb4"'
            ),
        name: z.string().describe('Template name, unique within its domain and used to address the template in the Mailgun API. Example: "welcome-email"'),
        description: z.string().optional().describe('Human-readable template description. Omitted when Mailgun returns none or null.'),
        createdAt: z.string().describe('Template creation date in RFC 2822 format as returned by Mailgun. Example: "Fri, 02 Oct 2026 00:24:46 UTC"'),
        domain: z.string().describe('Mailgun sending domain that owns the template. Example: "mg.example.com"')
    })
    .describe('A stored Mailgun message template. The list endpoint returns metadata only - version/body content is not included.');

const CheckpointSchema = z
    .object({
        latestCreatedAt: z
            .string()
            .describe(
                'Coarse high-water mark: latest template createdAt seen by the last completed run, "" when no template has been seen yet. Informational only - Mailgun templates have no created-since filter, so every run performs a full scan.'
            )
    })
    .describe('Sync progress: a coarse createdAt high-water mark. Pagination cursors are intentionally never persisted - every run is a full scan.');

// Internal parse schemas for provider responses only; not part of the public contract.
const MailgunTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    createdAt: z.string()
});

const MailgunTemplatesPageSchema = z.object({
    items: z.array(MailgunTemplateSchema),
    paging: z
        .object({
            next: z.string().optional()
        })
        .optional()
});

const MailgunDomainsPageSchema = z.object({
    total_count: z.number(),
    items: z.array(z.object({ name: z.string() }))
});

const PAGE_LIMIT = 100;

/**
 * Mailgun cursor pagination returns absolute URLs (`paging.next` carries the `page`/`p` cursor
 * params). Follow them verbatim by copying their query params back through the proxy, so the
 * connection's region keeps resolving the correct host.
 */
function queryParamsFromUrl(url: string): Record<string, string | number> {
    let parsed: URL;
    // @allowTryCatch: a malformed paging URL must hard-fail the run - silently ending pagination
    // mid-scan inside a delete-tracked window would make trackDeletesEnd remove valid records.
    try {
        parsed = new URL(url);
    } catch {
        throw new Error(`Mailgun paging.next is not a valid URL: ${url}`);
    }
    const params: Record<string, string | number> = {};
    parsed.searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

const sync = createSync({
    description: 'Syncs stored message templates, fanned out across all Mailgun domains on the account',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Template: TemplateSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Coarse high-water mark from the last completed run ('' when none has completed yet).
        let latestCreatedAt = checkpoint?.latestCreatedAt ?? '';
        let latestCreatedAtMs = Date.parse(latestCreatedAt);

        // Prerequisite: enumerate every domain on the account (skip/limit pagination, no cursor).
        // This must succeed before the delete-tracking window is opened.
        const domains: string[] = [];
        let skip = 0;
        let totalCount: number | undefined;
        while (totalCount === undefined || skip < totalCount) {
            const domainsConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domains/get-v4-domains.md
                // (the official reference lists only the v4 variant; this registry standardizes on the live-verified v3 endpoint)
                endpoint: '/v3/domains',
                params: { limit: PAGE_LIMIT, skip },
                retries: 3
            };
            const response = await nango.get(domainsConfig);
            const page = MailgunDomainsPageSchema.parse(response.data);
            totalCount = page.total_count;
            if (page.items.length === 0) {
                break;
            }
            for (const domain of page.items) {
                domains.push(domain.name);
            }
            skip += page.items.length;
        }

        await nango.trackDeletesStart('Template');

        let saved = 0;
        for (const domain of domains) {
            // Cursor pagination: follow `paging.next` (a full URL) until a page comes back empty.
            // Every run starts from page 1 of each domain; cursors are never restored.
            let nextParams: Record<string, string | number> | undefined = { limit: PAGE_LIMIT };
            while (nextParams) {
                const templatesConfig: ProxyConfiguration = {
                    // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domain-templates/get-v3--domain-name--templates.md
                    endpoint: `/v3/${encodeURIComponent(domain)}/templates`,
                    params: nextParams,
                    retries: 3
                };
                const response = await nango.get(templatesConfig);
                const page = MailgunTemplatesPageSchema.parse(response.data);

                if (page.items.length === 0) {
                    break;
                }

                const templates = page.items.map((template) => ({
                    id: `${domain}/${template.id}`,
                    name: template.name,
                    createdAt: template.createdAt,
                    domain,
                    ...(template.description != null && { description: template.description })
                }));
                await nango.batchSave(templates, 'Template');
                saved += templates.length;

                for (const template of templates) {
                    const createdAtMs = Date.parse(template.createdAt);
                    if (!Number.isNaN(createdAtMs) && (Number.isNaN(latestCreatedAtMs) || createdAtMs > latestCreatedAtMs)) {
                        latestCreatedAt = template.createdAt;
                        latestCreatedAtMs = createdAtMs;
                    }
                }

                nextParams = page.paging?.next ? queryParamsFromUrl(page.paging.next) : undefined;
            }
        }

        // Persist progress only now that the full scan completed; a mid-scan checkpoint would make
        // a crashed retry skip deletion detection on its next invocation.
        await nango.saveCheckpoint({ latestCreatedAt });
        await nango.trackDeletesEnd('Template');
        await nango.log(`Synced ${saved} templates across ${domains.length} domains`);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
