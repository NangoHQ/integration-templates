import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the project belongs to. Example: "my-org".'),
        project_id_or_slug: z.string().describe('The ID or slug of the project to list events for. Example: "my-project".'),
        statsPeriod: z
            .string()
            .optional()
            .describe(
                'Time window for the query: a number followed by d (days), h (hours), m (minutes), s (seconds), or w (weeks). Example: "24h". Overrides start and end when supplied.'
            ),
        start: z.string().optional().describe('Start of the query window in ISO-8601 format. Example: "2026-09-01T00:00:00". Ignored when statsPeriod is set.'),
        end: z.string().optional().describe('End of the query window in ISO-8601 format. Example: "2026-09-02T00:00:00". Ignored when statsPeriod is set.'),
        cursor: z.string().optional().describe('Opaque pagination cursor from the nextCursor of a previous response. Omit for the first page.'),
        full: z
            .boolean()
            .optional()
            .describe(
                'When true, include the full event body (including the stacktrace) in each event. Sentry caps the page size at 10 events when true. Defaults to false.'
            ),
        sample: z
            .boolean()
            .optional()
            .describe(
                'When true, return events in pseudo-random order. The order is deterministic: an identical query always returns the same events in the same order.'
            )
    })
    .describe('Input for listing events ingested for a project, optionally windowed by time.');

const EventUserSchema = z.object({
    id: z.string().optional().describe('ID of the user associated with the event.'),
    email: z.string().optional().describe('Email address of the user associated with the event.'),
    username: z.string().optional().describe('Username of the user associated with the event.'),
    ip_address: z.string().optional().describe('IP address of the user associated with the event.'),
    name: z.string().optional().describe('Display name of the user associated with the event.')
});

const EventTagSchema = z.object({
    key: z.string().describe('Tag name. Example: "environment".'),
    value: z.string().describe('Tag value. Example: "production".')
});

const EventSchema = z.looseObject({
    id: z.string().describe('ID of the event (32-character hex string). Example: "63be9f2fdd3f438d951b2bae4e847b51".'),
    eventID: z.string().describe('Event identifier as shown in the Sentry UI and used by event-detail endpoints. Example: "9fac2ceed9344f2bbfdd1fdacb0ed9b1".'),
    eventType: z.string().optional().describe('Type of the event, mapped from the provider\'s "event.type" field. Example: "error".'),
    groupID: z.string().optional().describe('ID of the issue (group) this event belongs to. Omitted when the event is not grouped into an issue.'),
    projectID: z.string().optional().describe('Numeric ID of the project that ingested the event.'),
    title: z.string().optional().describe('Title of the event, usually the exception or log message summary.'),
    message: z.string().optional().describe('Message associated with the event.'),
    location: z.string().optional().describe('Location in the source code where the event occurred. Example: "example.py:123".'),
    culprit: z.string().optional().describe('Function or module Sentry identified as the culprit.'),
    platform: z.string().optional().describe('Platform of the SDK that sent the event. Example: "node".'),
    dateCreated: z.string().optional().describe('ISO-8601 timestamp when the event was ingested. Example: "2026-09-29T17:46:36Z".'),
    user: EventUserSchema.optional().describe('User context attached to the event, when present.'),
    tags: z.array(EventTagSchema).optional().describe('Tags attached to the event.'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Event metadata, such as the exception type and value for error events.'),
    crashFile: z.string().optional().describe('Reference to an associated crash file (e.g. a minidump), when present.')
});

const OutputSchema = z
    .object({
        events: z.array(EventSchema).describe('Events ingested for the project, newest first unless sample is true.'),
        nextCursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page. Omitted when there are no more results.')
    })
    .describe('A page of project events plus the cursor for the next page.');

const SentryEventTagSchema = z.object({
    key: z.string(),
    value: z.string()
});

const SentryEventUserSchema = z.object({
    id: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    ip_address: z.string().nullable().optional(),
    name: z.string().nullable().optional()
});

const SentryEventSchema = z.looseObject({
    id: z.string(),
    eventID: z.string(),
    'event.type': z.string().optional(),
    groupID: z.string().nullable().optional(),
    projectID: z.string().optional(),
    title: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    culprit: z.string().nullable().optional(),
    platform: z.string().nullable().optional(),
    dateCreated: z.string().optional(),
    user: SentryEventUserSchema.nullable().optional(),
    tags: z.array(SentryEventTagSchema).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    crashFile: z.string().nullable().optional()
});

function parseNextCursor(linkHeader: string): string | undefined {
    for (const part of linkHeader.split(',')) {
        const segments = part.split(';').map((segment) => segment.trim());
        const rel = segments.find((segment) => segment.startsWith('rel='));
        const results = segments.find((segment) => segment.startsWith('results='));
        if (!rel || !rel.includes('"next"') || !results || !results.includes('"true"')) {
            continue;
        }
        const cursorSegment = segments.find((segment) => segment.startsWith('cursor='));
        const match = cursorSegment?.match(/cursor="([^"]+)"/);
        if (match && match[1]) {
            return match[1];
        }
    }
    return undefined;
}

function mapUser(user: z.infer<typeof SentryEventUserSchema>): z.infer<typeof EventUserSchema> {
    return {
        ...(user.id != null && { id: user.id }),
        ...(user.email != null && { email: user.email }),
        ...(user.username != null && { username: user.username }),
        ...(user.ip_address != null && { ip_address: user.ip_address }),
        ...(user.name != null && { name: user.name })
    };
}

function mapEvent(raw: z.infer<typeof SentryEventSchema>): z.infer<typeof EventSchema> {
    const { 'event.type': eventType, groupID, title, message, location, culprit, platform, crashFile, user, tags, ...rest } = raw;
    const mappedUser = user != null ? mapUser(user) : undefined;

    return {
        ...rest,
        ...(title != null && { title }),
        ...(message != null && { message }),
        ...(eventType !== undefined && { eventType }),
        ...(groupID != null && { groupID }),
        ...(location != null && { location }),
        ...(culprit != null && { culprit }),
        ...(platform != null && { platform }),
        ...(crashFile != null && { crashFile }),
        ...(mappedUser !== undefined && Object.keys(mappedUser).length > 0 && { user: mappedUser }),
        ...(tags !== undefined && { tags: tags.map((tag) => ({ key: tag.key, value: tag.value })) })
    };
}

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET request to list a project's events; it does not create, modify, or delete any provider data.
 * @pitfalls: statsPeriod overrides start and end when both are supplied. Setting full to true caps the page size at 10 events. Despite Sentry naming this an error-events listing, results can also include other event types such as "default". There is no modified-since filter, so use statsPeriod or start/end to window results.
 */
const action = createAction({
    description: 'List events ingested for a project, optionally windowed by time.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/events/list-a-projects-error-events/
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/events/`,
            params: {
                ...(input.statsPeriod !== undefined && { statsPeriod: input.statsPeriod }),
                ...(input.start !== undefined && { start: input.start }),
                ...(input.end !== undefined && { end: input.end }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                // Proxy params only accept strings/numbers, and Sentry defaults both flags to false when absent
                ...(input.full === true && { full: 'true' }),
                ...(input.sample === true && { sample: 'true' })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const linkHeader: unknown = response.headers['link'];
        const nextCursor = typeof linkHeader === 'string' ? parseNextCursor(linkHeader) : undefined;

        const events = z.array(SentryEventSchema).parse(response.data);

        return {
            events: events.map(mapEvent),
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
