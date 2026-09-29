import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Sentry retains events for a limited window (90 days on most plans), so the
// first run backfills that full retention window; later runs only fetch the
// window since the last successful run.
const INITIAL_LOOKBACK_DAYS = 90;

const EventUserSchema = z
    .object({
        id: z.string().optional().describe('ID of the user associated with the event, when known'),
        email: z.string().optional().describe('Email address of the user associated with the event, when known'),
        username: z.string().optional().describe('Username of the user associated with the event, when known'),
        ip_address: z.string().optional().describe('IP address of the user associated with the event, when known'),
        name: z.string().optional().describe('Display name of the user associated with the event, when known'),
        geo: z.record(z.string(), z.string()).optional().describe('Approximate geolocation (country, region, city) derived from the user IP address'),
        data: z.record(z.string(), z.unknown()).optional().describe('Additional free-form user attributes sent with the event')
    })
    .describe('User context attached to the event, when Sentry could associate one');

const EventTagSchema = z
    .object({
        key: z.string().describe('Tag name, e.g. "environment", "release" or "level"'),
        value: z.string().describe('Tag value, e.g. "production"')
    })
    .describe('Key/value tag attached to the event');

const EventSchema = z
    .object({
        id: z
            .string()
            .describe(
                'Unique Sentry event ID (32-character hex string), e.g. "63be9f2fdd3f438d951b2bae4e847b51". Globally unique across projects, so it is used directly as the sync record ID.'
            ),
        eventID: z.string().optional().describe('Sentry event UUID; identical to id, kept for parity with the provider payload'),
        projectID: z.string().optional().describe('Numeric ID of the Sentry project that ingested the event, e.g. "4512170111991808"'),
        groupID: z.string().optional().describe('Numeric ID of the issue (group) this event belongs to; omitted when the event is not grouped into an issue'),
        title: z.string().optional().describe('Human-readable event title, e.g. "TypeError: undefined is not a function"'),
        message: z.string().optional().describe('Event message as sent by the SDK'),
        location: z.string().optional().describe('File or function location where the event occurred'),
        culprit: z.string().optional().describe('Function or module Sentry identified as the cause of the event'),
        platform: z.string().optional().describe('SDK platform that sent the event, e.g. "node"'),
        dateCreated: z
            .string()
            .optional()
            .describe('ISO-8601 timestamp of when Sentry ingested the event, e.g. "2026-09-29T15:04:05.000Z"; omitted on the rare event Sentry cannot date'),
        eventType: z.string().optional().describe('Sentry event type, e.g. "error" or "default" (maps the provider field "event.type")'),
        user: EventUserSchema.optional().describe('User context attached to the event, when Sentry could associate one'),
        tags: z.array(EventTagSchema).optional().describe('Tags attached to the event'),
        crashFile: z.string().optional().describe('Reference to an attached crash file (e.g. minidump), when present'),
        metadata: z.record(z.string(), z.unknown()).optional().describe('Free-form event metadata as returned by Sentry (e.g. title, filename, function)')
    })
    .describe('A Sentry event ingested by a project (summary payload; the full event body with stacktrace is not included)');

// A missing (null) checkpoint marks the first run, so the saved shape always
// carries the window end and the field is intentionally not optional.
const CheckpointSchema = z.object({
    last_window_end: z.string()
});

// Internal schemas below only parse provider responses and intentionally carry
// no descriptions.

const SentryOrganizationSchema = z.object({
    id: z.string(),
    slug: z.string()
});

const SentryProjectSchema = z.object({
    id: z.string(),
    slug: z.string()
});

const SentryEventSchema = z.object({
    id: z.string(),
    eventID: z.string().optional(),
    projectID: z.string().optional(),
    groupID: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    culprit: z.string().nullable().optional(),
    platform: z.string().nullable().optional(),
    dateCreated: z.string().optional(),
    'event.type': z.string().optional(),
    user: z
        .object({
            id: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
            username: z.string().nullable().optional(),
            ip_address: z.string().nullable().optional(),
            name: z.string().nullable().optional(),
            geo: z.record(z.string(), z.string()).nullable().optional(),
            data: z.record(z.string(), z.unknown()).nullable().optional()
        })
        .nullable()
        .optional(),
    tags: z
        .array(
            z.object({
                key: z.string(),
                value: z.string(),
                query: z.string().optional()
            })
        )
        .optional(),
    crashFile: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

type SentryEvent = z.infer<typeof SentryEventSchema>;

function toEvent(raw: SentryEvent): z.infer<typeof EventSchema> {
    return {
        id: raw.id,
        ...(raw.dateCreated != null && { dateCreated: raw.dateCreated }),
        ...(raw.eventID != null && { eventID: raw.eventID }),
        ...(raw.projectID != null && { projectID: raw.projectID }),
        ...(raw.groupID != null && { groupID: raw.groupID }),
        ...(raw.title != null && { title: raw.title }),
        ...(raw.message != null && { message: raw.message }),
        ...(raw.location != null && { location: raw.location }),
        ...(raw.culprit != null && { culprit: raw.culprit }),
        ...(raw.platform != null && { platform: raw.platform }),
        ...(raw['event.type'] != null && { eventType: raw['event.type'] }),
        ...(raw.crashFile != null && { crashFile: raw.crashFile }),
        ...(raw.metadata != null && { metadata: raw.metadata }),
        ...(raw.user != null && {
            user: {
                ...(raw.user.id != null && { id: raw.user.id }),
                ...(raw.user.email != null && { email: raw.user.email }),
                ...(raw.user.username != null && { username: raw.user.username }),
                ...(raw.user.ip_address != null && { ip_address: raw.user.ip_address }),
                ...(raw.user.name != null && { name: raw.user.name }),
                ...(raw.user.geo != null && { geo: raw.user.geo }),
                ...(raw.user.data != null && { data: raw.user.data })
            }
        }),
        ...(raw.tags != null && { tags: raw.tags.map((tag) => ({ key: tag.key, value: tag.value })) })
    };
}

// Extracts the follow-up cursor from the `rel="next"` entry of a Sentry `Link`
// response header. Sentry signals the end of the result set with
// `results="false"` on that entry while still returning a fresh cursor value,
// so the results flag -- not the presence of a link -- decides whether another
// page exists.
function nextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }

    for (const part of linkHeader.split(',')) {
        if (!/rel="next"/.test(part)) {
            continue;
        }

        if (/results="false"/.test(part)) {
            return undefined;
        }

        const cursorAttribute = /cursor="([^"]+)"/.exec(part);
        const attributeValue = cursorAttribute?.[1];
        if (attributeValue) {
            return attributeValue;
        }

        const cursorInUrl = /[?&]cursor=([^&>]+)/.exec(part);
        const urlValue = cursorInUrl?.[1];
        if (urlValue) {
            return decodeURIComponent(urlValue);
        }

        return undefined;
    }

    return undefined;
}

// Fetches every page of a Sentry list endpoint. Sentry paginates via the RFC
// 5988 `Link` response header and keeps emitting a `rel="next"` link with a new
// cursor even when that link has `results="false"`, which `nango.paginate`'s
// link mode would follow forever -- so pagination is done manually here,
// stopping as soon as the next link no longer reports results.
async function* fetchAllPages(nango: NangoSyncLocal, endpoint: string, params: Record<string, string | number>): AsyncGenerator<unknown[], void, void> {
    let cursor: string | undefined;

    do {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/pagination/
            endpoint,
            params: {
                ...params,
                ...(cursor !== undefined && { cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);

        yield z.array(z.unknown()).parse(response.data);

        cursor = nextCursor(response.headers['link']);
    } while (cursor !== undefined);
}

const sync = createSync({
    description: 'Sync events ingested per project, using time-window pagination',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['event:read', 'project:read', 'org:read'],
    models: {
        Event: EventSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const windowEnd = new Date().toISOString();
        // Sentry rejects `start` without `end` ("Invalid date range parameters
        // provided"), and `statsPeriod` overrides `start`/`end` when combined, so
        // the first run backfills with a relative period while incremental runs
        // query the explicit window since the last successful run.
        const windowParams: Record<string, string> = checkpoint?.last_window_end
            ? { start: checkpoint.last_window_end, end: windowEnd }
            : { statsPeriod: `${INITIAL_LOOKBACK_DAYS}d` };

        // A Sentry API token only sees the organizations it is scoped to, so the
        // organization is resolved dynamically instead of being configured.
        // https://docs.sentry.io/api/users/list-your-organizations/
        let organizationSlug: string | undefined;
        for await (const page of fetchAllPages(nango, '/0/organizations/', { per_page: 100 })) {
            const organizations = z.array(SentryOrganizationSchema).parse(page);
            const first = organizations[0];
            if (first) {
                organizationSlug = first.slug;
                break;
            }
        }

        if (!organizationSlug) {
            throw new Error('No Sentry organization is visible to this connection');
        }

        // Events are listed per project, so first collect every project in the
        // organization.
        // https://docs.sentry.io/api/organizations/list-an-organizations-projects/
        const projects: z.infer<typeof SentryProjectSchema>[] = [];
        for await (const page of fetchAllPages(nango, `/0/organizations/${encodeURIComponent(organizationSlug)}/projects/`, { per_page: 100 })) {
            projects.push(...z.array(SentryProjectSchema).parse(page));
        }

        for (const project of projects) {
            // The events endpoint has no documented page-size parameter (checked
            // against the Sentry OpenAPI spec), so only the time window is sent.
            // https://docs.sentry.io/api/events/list-a-projects-error-events/
            const endpoint = `/0/projects/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(project.slug)}/events/`;

            for await (const page of fetchAllPages(nango, endpoint, windowParams)) {
                const events = z.array(SentryEventSchema).parse(page).map(toEvent);

                if (events.length === 0) {
                    continue;
                }

                await nango.batchSave(events, 'Event');
            }
        }

        // Advance the window only after every project has been fully crawled. A
        // crashed run re-fetches the whole window on the next execution, which is
        // safe because events are immutable and batchSave upserts by event id.
        await nango.saveCheckpoint({ last_window_end: windowEnd });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
