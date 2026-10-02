import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import * as z from 'zod';

const LIMIT = 100;

const DomainSchema = z
    .object({
        id: z.string().describe('Unique Mailgun identifier of the domain. Example: "69aeedd584d39943e1a587f1"'),
        name: z.string().describe('Fully qualified domain name. Example: "mg.example.com"'),
        type: z.string().optional().describe('Domain type: "custom" for a customer-added domain or "sandbox" for the Mailgun-provided test domain'),
        state: z.string().optional().describe('Domain state, e.g. "active", "unverified" or "disabled"'),
        created_at: z.string().optional().describe('Creation date of the domain as an RFC 2822 string. Example: "Mon, 09 Mar 2026 15:57:09 GMT"'),
        smtp_login: z.string().optional().describe('Default SMTP login of the domain. Example: "postmaster@mg.example.com"'),
        spam_action: z.string().optional().describe('How spam-filtered inbound mail is handled: "disabled", "block" or "tag"'),
        wildcard: z.boolean().optional().describe('Whether wildcard subdomain sending is enabled for the domain'),
        require_tls: z.boolean().optional().describe('Whether TLS is required when delivering messages for the domain'),
        skip_verification: z.boolean().optional().describe('Whether DNS verification was skipped when the domain was added'),
        is_disabled: z.boolean().optional().describe('Whether the domain is currently disabled'),
        use_automatic_sender_security: z.boolean().optional().describe('Whether automatic sender security (managed DKIM/SPF keys) is enabled'),
        web_prefix: z.string().optional().describe('Subdomain prefix used for open/click tracking links. Example: "email"'),
        web_scheme: z.string().optional().describe('URL scheme used for tracking links: "http" or "https"'),
        encrypt_incoming_message: z.boolean().optional().describe('Whether incoming messages are encrypted at rest'),
        message_ttl: z.number().optional().describe('Time in seconds a stored message is retained before expiry. Example: 86400')
    })
    .describe('A sending domain configured on the Mailgun account');

const CheckpointSchema = z.object({
    skip: z.number().int().nonnegative().describe('Offset into the domains list, recording pagination progress of an interrupted scan')
});

const MailgunDomainSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    state: z.string().optional(),
    created_at: z.string().optional(),
    smtp_login: z.string().optional(),
    spam_action: z.string().optional(),
    wildcard: z.boolean().optional(),
    require_tls: z.boolean().optional(),
    skip_verification: z.boolean().optional(),
    is_disabled: z.boolean().optional(),
    use_automatic_sender_security: z.boolean().optional(),
    web_prefix: z.string().optional(),
    web_scheme: z.string().optional(),
    encrypt_incoming_message: z.boolean().optional(),
    message_ttl: z.number().optional()
});

type Domain = z.infer<typeof DomainSchema>;

const sync = createSync({
    description: 'Sync all sending domains on the Mailgun account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Domain: DomainSchema
    },

    exec: async (nango) => {
        // Full refresh: GET /v3/domains has no changed-since filter and the domain object has no
        // mutable timestamp (created_at is immutable), so there is no incremental change source.
        // The checkpoint only ever holds pagination progress from an interrupted run. Because this
        // is a delete-tracked scan it must always rescan from the first page: resuming from a saved
        // offset would skip earlier domains and trackDeletesEnd() would falsely delete them. The
        // saved offset is therefore intentionally discarded and never persisted mid-scan.
        await nango.getCheckpoint();

        const proxyConfig: ProxyConfiguration = {
            // https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Domains/#tag/Domains/operation/GET-v3-domains
            endpoint: '/v3/domains',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: LIMIT,
                response_path: 'items'
            },
            retries: 3
        };

        // The delete-tracking window is opened only after the first page has been fetched and
        // validated, so a request or parse failure before any data is confirmed leaves the
        // window closed instead of open indefinitely. trackDeletesStart/trackDeletesEnd may each
        // only appear once in this function, so the first page is pulled manually ahead of the
        // loop that pulls the rest, rather than via a second call site inside/after a for-await.
        const pageIterator = nango.paginate<unknown>(proxyConfig);

        function parsePage(batch: unknown[]): Domain[] {
            const domains: Domain[] = [];
            for (const item of batch) {
                // Throw on parse failure: silently skipping a record inside a delete-tracked scan
                // would cause trackDeletesEnd() to falsely mark it as deleted.
                domains.push(MailgunDomainSchema.parse(item));
            }
            return domains;
        }

        const firstResult = await pageIterator.next();
        const firstDomains = firstResult.done ? [] : parsePage(firstResult.value);

        await nango.trackDeletesStart('Domain');

        if (firstDomains.length > 0) {
            await nango.batchSave(firstDomains, 'Domain');
        }

        let nextResult = await pageIterator.next();
        while (!nextResult.done) {
            const domains = parsePage(nextResult.value);
            if (domains.length > 0) {
                await nango.batchSave(domains, 'Domain');
            }
            nextResult = await pageIterator.next();
        }

        // The full domain list has been walked: clear any stale pagination state, then close the
        // delete-tracking window exactly once so domains removed from the account are detected.
        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Domain');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
