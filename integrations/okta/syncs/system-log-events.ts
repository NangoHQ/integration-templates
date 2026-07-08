import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    since: z.string()
});

const LogEventSchema = z.object({
    uuid: z.string(),
    published: z.string(),
    eventType: z.string().optional(),
    displayMessage: z.string().optional(),
    severity: z.string().optional(),
    legacyEventType: z.string().optional(),
    version: z.string().optional(),
    actor: z.record(z.string(), z.unknown()).optional(),
    target: z.array(z.record(z.string(), z.unknown())).optional(),
    client: z.record(z.string(), z.unknown()).optional(),
    authenticationContext: z.record(z.string(), z.unknown()).optional(),
    outcome: z.record(z.string(), z.unknown()).optional(),
    request: z.record(z.string(), z.unknown()).optional(),
    transaction: z.record(z.string(), z.unknown()).optional(),
    debugContext: z.record(z.string(), z.unknown()).optional(),
    securityContext: z.record(z.string(), z.unknown()).optional()
});

const SystemLogEventSchema = LogEventSchema.extend({
    id: z.string()
});

const sync = createSync({
    description: 'Sync system log events.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SystemLogEvent: SystemLogEventSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const validatedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const since = validatedCheckpoint.success ? validatedCheckpoint.data.since : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/system-log/
            endpoint: '/api/v1/logs',
            params: {
                sortOrder: 'ASCENDING',
                limit: 1000,
                ...(since && { since })
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 1000
            },
            retries: 3
        };

        let lastPublished: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                continue;
            }

            const events = [];
            for (const item of page) {
                const parsed = LogEventSchema.safeParse(item);
                if (parsed.success) {
                    events.push(parsed.data);
                }
            }

            if (events.length === 0) {
                // Okta's System Log always returns a rel="next" link for an ASCENDING
                // polling query (no `until`), so an empty page — not a missing next
                // link — is the documented signal that we've caught up to the live
                // tail. Stop here rather than bounding the query with `until`, which
                // would risk skipping events whose `published` time lags behind when
                // Okta actually persists/indexes them.
                break;
            }

            const records = events.map((event) => ({
                id: event.uuid,
                uuid: event.uuid,
                published: event.published,
                ...(event.eventType !== undefined && { eventType: event.eventType }),
                ...(event.displayMessage !== undefined && { displayMessage: event.displayMessage }),
                ...(event.severity !== undefined && { severity: event.severity }),
                ...(event.legacyEventType !== undefined && { legacyEventType: event.legacyEventType }),
                ...(event.version !== undefined && { version: event.version }),
                ...(event.actor !== undefined && { actor: event.actor }),
                ...(event.target !== undefined && { target: event.target }),
                ...(event.client !== undefined && { client: event.client }),
                ...(event.authenticationContext !== undefined && { authenticationContext: event.authenticationContext }),
                ...(event.outcome !== undefined && { outcome: event.outcome }),
                ...(event.request !== undefined && { request: event.request }),
                ...(event.transaction !== undefined && { transaction: event.transaction }),
                ...(event.debugContext !== undefined && { debugContext: event.debugContext }),
                ...(event.securityContext !== undefined && { securityContext: event.securityContext })
            }));

            await nango.batchSave(records, 'SystemLogEvent');

            const lastEvent = events[events.length - 1];
            if (lastEvent) {
                lastPublished = lastEvent.published;
            }
        }

        if (lastPublished) {
            await nango.saveCheckpoint({ since: lastPublished });
        }
    }
});

export default sync;
