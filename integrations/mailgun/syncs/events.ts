import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

/**
 * Sync strategy
 * - change source: `begin` time filter on `GET /v3/{domain}/events` (append-only event log), ascending order,
 *   with a per-domain high-watermark on the event `timestamp` (unix epoch seconds, float)
 * - checkpoint schema: `{ domain_timestamps: string }` — a JSON-encoded map of domain -> latest event timestamp seen.
 *   Nango checkpoints only support flat string/number/boolean fields, so the per-domain map is stored serialized.
 * - how the checkpoint changes the request: once a domain has a saved watermark, its events request uses
 *   `begin = max(0, watermark - 300s)` and `end = sync-start time` (a bounded snapshot window). The overlap
 *   covers delayed/late-arriving events; id-keyed upserts dedupe the re-fetched overlap. A domain with no
 *   stored watermark uses `begin = 0` and no `end`, establishing its initial baseline from Mailgun's retention window.
 * - delete strategy: none. The event log is append-only; Mailgun never deletes individual events, they only age
 *   out of the retention window. Changed-only checkpoints must not be combined with trackDeletesStart/End.
 */

// Overlap applied to the per-domain high-watermark so late-arriving events (e.g. a delivered event posted
// slightly after its accepted event) are not missed. Upserts by id dedupe the re-fetched overlap.
const WATERMARK_OVERLAP_SECONDS = 300;

const DeliveryStatusSchema = z
    .object({
        code: z.number().optional().describe('SMTP response code returned by the receiving server, e.g. 250.'),
        message: z.string().optional().describe('Full SMTP response message returned by the receiving server.'),
        description: z.string().optional().describe('Short human-readable delivery status description.'),
        enhanced_code: z.string().optional().describe('Enhanced SMTP status code, e.g. "2.0.0".'),
        mx_host: z.string().optional().describe('Hostname of the receiving MX server, e.g. "aspmx.l.google.com".'),
        mx_host_ip: z.string().optional().describe('IP address of the receiving MX server.'),
        attempt_no: z.number().optional().describe('Delivery attempt number, starting at 1.'),
        session_seconds: z.number().optional().describe('Duration of the SMTP delivery session in seconds (float).'),
        first_delivery_attempt_seconds: z.number().optional().describe('Seconds between message acceptance and the first delivery attempt (float).'),
        tls: z.boolean().optional().describe('Whether TLS was negotiated with the receiving server.'),
        certificate_verified: z.boolean().optional().describe('Whether the receiving server certificate was verified.')
    })
    .optional()
    .describe('Delivery status details; present mainly on delivered and failed events.');

const EventSchema = z
    .object({
        id: z.string().describe('Unique record id in the form `${domain}:${event_id}` so ids cannot collide across domains.'),
        event_id: z.string().describe('Mailgun event GUID, unique within its domain, e.g. "0_j20QZ_TJ2iOoRwo0TK1A".'),
        domain: z.string().describe('The Mailgun sending domain this event belongs to, e.g. "mg.example.com".'),
        event: z.string().describe('Event type, e.g. accepted, delivered, failed, rejected, opened, clicked, complained, unsubscribed or stored.'),
        timestamp: z.number().describe('Unix epoch timestamp in seconds (float) when the event occurred, e.g. 1790875136.2817214.'),
        recipient: z.string().optional().describe('Recipient email address the event relates to. Can be an empty string on some rejected events.'),
        recipient_domain: z.string().optional().describe('Domain part of the recipient address, e.g. "example.com".'),
        from: z.string().optional().describe('Sender address: the message From header when present, otherwise the envelope sender.'),
        subject: z.string().optional().describe('Subject line of the message, when present on the event.'),
        message_id: z.string().optional().describe('Mailgun message id from the Message-Id header, e.g. "20261001171855.a0270cd53d7ce72c@mg.example.com".'),
        severity: z.string().optional().describe('Event severity for failed events, e.g. "permanent" or "temporary".'),
        reason: z.string().optional().describe('Human-readable reason for failed or rejected events, when provided.'),
        log_level: z.string().optional().describe('Mailgun log level for the event, e.g. "info", "warn" or "error".'),
        method: z.string().optional().describe('How the message was submitted to Mailgun, e.g. "HTTP" or "SMTP"; can be empty.'),
        ip: z.string().optional().describe('IP address that triggered an engagement event (opened/clicked), when present.'),
        originating_ip: z.string().optional().describe('IP address of the sender that submitted the message to Mailgun, when present.'),
        sending_ip: z.string().optional().describe('Mailgun IP address used to deliver the message, when present.'),
        tags: z.array(z.string().describe('A user-defined tag attached to the message.')).optional().describe('User-defined tags attached to the message.'),
        storage_url: z.string().optional().describe('URL of the stored message in Mailgun storage, when the message was stored.'),
        delivery_status: DeliveryStatusSchema
    })
    .describe('A Mailgun event log entry (delivery, engagement or suppression event) for a message, normalized across all domains on the connection.');

// Nango checkpoints only support flat string/number/boolean values, so the per-domain high-watermarks are
// stored as a JSON-encoded string: {"mg.example.com": 1790875136.2817214, ...}
const CheckpointSchema = z.object({
    domain_timestamps: z.string()
});

const DomainTimestampsSchema = z.record(z.string(), z.number());

// Raw Mailgun event payload. Events are loosely structured JSON documents whose exact shape depends on the
// event type; `id`, `event` and `timestamp` are the only fields guaranteed on every event. Only the fields
// mapped into the public model are declared here; everything else is stripped on parse.
const MailgunEventSchema = z.object({
    id: z.string(),
    event: z.string(),
    timestamp: z.number(),
    recipient: z.string().optional(),
    'recipient-domain': z.string().optional(),
    'log-level': z.string().optional(),
    method: z.string().optional(),
    severity: z.string().optional(),
    reason: z.string().optional(),
    ip: z.string().optional(),
    'originating-ip': z.string().optional(),
    tags: z.array(z.string()).optional(),
    message: z
        .object({
            headers: z
                .object({
                    from: z.string().optional(),
                    subject: z.string().optional(),
                    'message-id': z.string().optional()
                })
                .optional()
        })
        .optional(),
    envelope: z
        .object({
            sender: z.string().optional(),
            'sending-ip': z.string().optional()
        })
        .optional(),
    reject: z
        .object({
            reason: z.string().optional(),
            description: z.string().optional()
        })
        .optional(),
    storage: z
        .object({
            url: z.string().optional()
        })
        .optional(),
    'delivery-status': z
        .object({
            code: z.number().optional(),
            message: z.string().optional(),
            description: z.string().optional(),
            'enhanced-code': z.string().optional(),
            'mx-host': z.string().optional(),
            'mx-host-ip': z.string().optional(),
            'attempt-no': z.number().optional(),
            'session-seconds': z.number().optional(),
            'first-delivery-attempt-seconds': z.number().optional(),
            tls: z.boolean().optional(),
            'certificate-verified': z.boolean().optional()
        })
        .optional()
});

const DomainsResponseSchema = z.object({
    total_count: z.number(),
    items: z.array(z.object({ name: z.string() }))
});

type MailgunEvent = z.infer<typeof MailgunEventSchema>;
type Event = z.infer<typeof EventSchema>;

function decodeDomainTimestamps(checkpoint: z.infer<typeof CheckpointSchema> | null | undefined): Record<string, number> {
    if (!checkpoint) {
        return {};
    }
    // The checkpoint stores a JSON-encoded string (see CheckpointSchema above), so it must be
    // parsed before validating its shape; validating the raw string against a record schema
    // would always fail and silently discard every domain's watermark.
    let decoded: unknown;
    // @allowTryCatch: a corrupt or unparseable checkpoint must not crash the run; falling back
    // to an empty watermark map is a safe, self-healing default (every domain re-baselines).
    try {
        decoded = JSON.parse(checkpoint.domain_timestamps);
    } catch {
        return {};
    }
    const parsed = DomainTimestampsSchema.safeParse(decoded);
    return parsed.success ? parsed.data : {};
}

function toEventRecord(raw: MailgunEvent, domain: string): Event {
    const reason = raw.reason ?? raw.reject?.reason;
    const from = raw.message?.headers?.from ?? raw.envelope?.sender;
    const deliveryStatus = raw['delivery-status'];
    return {
        id: `${domain}:${raw.id}`,
        event_id: raw.id,
        domain,
        event: raw.event,
        timestamp: raw.timestamp,
        ...(raw.recipient !== undefined && { recipient: raw.recipient }),
        ...(raw['recipient-domain'] !== undefined && { recipient_domain: raw['recipient-domain'] }),
        ...(from !== undefined && { from }),
        ...(raw.message?.headers?.subject !== undefined && { subject: raw.message.headers.subject }),
        ...(raw.message?.headers?.['message-id'] !== undefined && { message_id: raw.message.headers['message-id'] }),
        ...(raw.severity !== undefined && { severity: raw.severity }),
        ...(reason !== undefined && { reason }),
        ...(raw['log-level'] !== undefined && { log_level: raw['log-level'] }),
        ...(raw.method !== undefined && { method: raw.method }),
        ...(raw.ip !== undefined && { ip: raw.ip }),
        ...(raw['originating-ip'] !== undefined && { originating_ip: raw['originating-ip'] }),
        ...(raw.envelope?.['sending-ip'] !== undefined && { sending_ip: raw.envelope['sending-ip'] }),
        ...(raw.tags !== undefined && { tags: raw.tags }),
        ...(raw.storage?.url !== undefined && { storage_url: raw.storage.url }),
        ...(deliveryStatus !== undefined && {
            delivery_status: {
                ...(deliveryStatus.code !== undefined && { code: deliveryStatus.code }),
                ...(deliveryStatus.message !== undefined && { message: deliveryStatus.message }),
                ...(deliveryStatus.description !== undefined && { description: deliveryStatus.description }),
                ...(deliveryStatus['enhanced-code'] !== undefined && { enhanced_code: deliveryStatus['enhanced-code'] }),
                ...(deliveryStatus['mx-host'] !== undefined && { mx_host: deliveryStatus['mx-host'] }),
                ...(deliveryStatus['mx-host-ip'] !== undefined && { mx_host_ip: deliveryStatus['mx-host-ip'] }),
                ...(deliveryStatus['attempt-no'] !== undefined && { attempt_no: deliveryStatus['attempt-no'] }),
                ...(deliveryStatus['session-seconds'] !== undefined && { session_seconds: deliveryStatus['session-seconds'] }),
                ...(deliveryStatus['first-delivery-attempt-seconds'] !== undefined && {
                    first_delivery_attempt_seconds: deliveryStatus['first-delivery-attempt-seconds']
                }),
                ...(deliveryStatus.tls !== undefined && { tls: deliveryStatus.tls }),
                ...(deliveryStatus['certificate-verified'] !== undefined && { certificate_verified: deliveryStatus['certificate-verified'] })
            }
        })
    };
}

const sync = createSync({
    description:
        'Syncs Mailgun event log entries (accepted, delivered, failed, rejected, opened, clicked, complained, etc.) across all domains on the connection. Incremental via a per-domain timestamp high-watermark; only covers the Mailgun event retention window, not a permanent archive.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const domainTimestamps = decodeDomainTimestamps(checkpoint);
        const syncEnd = Math.floor(Date.now() / 1000);

        // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/domains/get-v3-domains
        // Paginated to completion: a single page caps at 1000 domains, which would silently drop
        // every later domain's events for an account with more domains than that.
        const domains: string[] = [];
        let skip = 0;
        let totalDomainCount: number | undefined;
        while (totalDomainCount === undefined || skip < totalDomainCount) {
            const domainsResponse = await nango.get({
                endpoint: '/v3/domains',
                params: { limit: 1000, skip },
                retries: 3
            });
            const page = DomainsResponseSchema.parse(domainsResponse.data);
            totalDomainCount = page.total_count;
            if (page.items.length === 0) {
                break;
            }
            for (const domain of page.items) {
                domains.push(domain.name);
            }
            skip += page.items.length;
        }

        for (const domain of domains) {
            const watermark = domainTimestamps[domain];
            const begin = watermark !== undefined ? Math.max(0, watermark - WATERMARK_OVERLAP_SECONDS) : 0;
            const end = watermark !== undefined ? Math.max(syncEnd, begin) : undefined;

            const proxyConfig: ProxyConfiguration = {
                // https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/events/get-v3-domain_name-events
                endpoint: `/v3/${encodeURIComponent(domain)}/events`,
                params: {
                    ascending: 'yes',
                    begin,
                    ...(end !== undefined ? { end } : {})
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'paging.next',
                    response_path: 'items',
                    limit_name_in_request: 'limit',
                    limit: 300
                },
                retries: 3
            };

            let domainMax = watermark;

            for await (const items of nango.paginate<unknown>(proxyConfig)) {
                if (items.length === 0) {
                    // An empty page means the scan has exhausted its bounded window (incremental
                    // runs) or caught up to now (the initial baseline run). Mailgun also keeps
                    // mutating the `paging.next` token on exhausted windows, so the link paginator
                    // would never see a repeating link; break instead of continuing.
                    break;
                }

                const records = items.map((item) => toEventRecord(MailgunEventSchema.parse(item), domain));
                await nango.batchSave(records, 'Event');

                const pageMax = Math.max(...records.map((record) => record.timestamp));
                if (domainMax === undefined || pageMax > domainMax) {
                    domainMax = pageMax;
                }
                domainTimestamps[domain] = domainMax;
                await nango.saveCheckpoint({ domain_timestamps: JSON.stringify(domainTimestamps) });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
