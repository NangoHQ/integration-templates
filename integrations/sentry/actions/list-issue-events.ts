import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the Sentry organization that owns the issue. Example: "nangodev".'),
        issue_id: z
            .string()
            .regex(/^\d+$/)
            .describe(
                'Numeric ID of the issue (group) whose events to list. This is the numeric "id" of the issue, not the human-readable "shortId" shown in Sentry permalinks. Example: "7761433611".'
            ),
        query: z.string().optional().describe('Optional Sentry search query to filter the returned events. Example: "release:abc AND level:error".'),
        environment: z.string().optional().describe('Optional single environment name to filter events by. Example: "production".'),
        full: z
            .boolean()
            .optional()
            .describe(
                'Set to true to include the full event body (including the stacktrace) in each returned event. When true, Sentry caps the page size at 10 events.'
            ),
        per_page: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Maximum number of events to return in this page. Sentry default and maximum is 100 (capped at 10 when full is true).'),
        cursor: z
            .string()
            .regex(/^-?\d+(\.\d+)?:-?\d+:[01]$/)
            .optional()
            .describe(
                'Pagination cursor from the nextCursor of a previous response, in Sentry "value:offset:direction" format. Example: "100:1:0". Omit for the first page.'
            )
    })
    .describe('Input for listing the events of a Sentry issue.');

const ProviderEventUserSchema = z.object({
    id: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    ip_address: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    geo: z.record(z.string(), z.string()).nullable().optional(),
    data: z.record(z.string(), z.unknown()).nullable().optional()
});

const ProviderEventTagSchema = z.object({
    key: z.string(),
    value: z.string(),
    query: z.string().optional()
});

const ProviderEventSchema = z.object({
    id: z.string(),
    eventID: z.string(),
    'event.type': z.string(),
    groupID: z.string().nullable(),
    projectID: z.string(),
    message: z.string(),
    title: z.string(),
    location: z.string().nullable(),
    culprit: z.string().nullable(),
    user: ProviderEventUserSchema.nullable(),
    tags: z.array(ProviderEventTagSchema),
    platform: z.string().nullable(),
    dateCreated: z.string(),
    crashFile: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown())
});

const IssueEventUserSchema = z
    .object({
        id: z.string().optional().describe('Sentry user ID associated with the event. Omitted when Sentry reports null.'),
        email: z.string().optional().describe('Email address of the user associated with the event. Omitted when Sentry reports null.'),
        username: z.string().optional().describe('Username of the user associated with the event. Omitted when Sentry reports null.'),
        ip_address: z.string().optional().describe('IP address of the user associated with the event. Omitted when Sentry reports null.'),
        name: z.string().optional().describe('Display name of the user associated with the event. Omitted when Sentry reports null.'),
        geo: z
            .record(z.string(), z.string())
            .optional()
            .describe('Approximate geographic information (such as city, country_code, region) derived from the event IP. Omitted when Sentry reports null.'),
        data: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Additional free-form user attributes sent with the event. Omitted when Sentry reports null.')
    })
    .describe('User context attached to the event.');

const IssueEventTagSchema = z
    .object({
        key: z.string().describe('Tag key. Example: "browser".'),
        value: z.string().describe('Tag value. Example: "Chrome 60.0".'),
        query: z.string().optional().describe('Sentry search query snippet matching this tag value, when returned by the API.')
    })
    .describe('A key/value tag attached to the event.');

const IssueEventSchema = z
    .object({
        id: z.string().describe('Unique ID of the event. Example: "63be9f2fdd3f438d951b2bae4e847b51".'),
        eventID: z.string().describe('Hexadecimal event identifier (same value as id). Example: "63be9f2fdd3f438d951b2bae4e847b51".'),
        'event.type': z.string().describe('Type of the event. Example: "error".'),
        groupID: z.string().optional().describe('Numeric ID of the issue (group) this event belongs to. Omitted when Sentry reports null.'),
        projectID: z.string().describe('Numeric ID of the project the event belongs to.'),
        message: z.string().describe('Event message.'),
        title: z.string().describe('Event title.'),
        location: z.string().optional().describe('Source location of the error, e.g. "example.py:123". Omitted when Sentry reports null.'),
        culprit: z.string().optional().describe('Function or module Sentry identified as the culprit. Omitted when Sentry reports null.'),
        user: IssueEventUserSchema.optional().describe('User context attached to the event. Omitted when Sentry reports null.'),
        tags: z.array(IssueEventTagSchema).describe('Tags attached to the event.'),
        platform: z.string().optional().describe('Platform of the SDK that sent the event, e.g. "node" or "python". Omitted when Sentry reports null.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the event was created. Example: "2020-09-11T17:46:36Z".'),
        crashFile: z.string().optional().describe('Reference to an associated crash file (e.g. minidump), when present. Omitted when Sentry reports null.'),
        metadata: z.record(z.string(), z.unknown()).describe('Event metadata; shape varies by event type. Error events typically include "type" and "value".')
    })
    .describe('A single Sentry event belonging to the issue.');

const OutputSchema = z
    .object({
        events: z.array(IssueEventSchema).describe('Events that make up the issue.'),
        nextCursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('List of events belonging to the issue, plus the cursor for the next page when more results exist.');

function parseNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const nextLink = linkHeader.split(',').find((part) => part.includes('rel="next"'));
    if (!nextLink || !/results="true"/.test(nextLink)) {
        return undefined;
    }
    const cursorMatch = /cursor="([^"]+)"/.exec(nextLink);
    return cursorMatch?.[1];
}

function mapUser(user: z.infer<typeof ProviderEventUserSchema>): z.infer<typeof IssueEventUserSchema> {
    return {
        ...(user.id != null && { id: user.id }),
        ...(user.email != null && { email: user.email }),
        ...(user.username != null && { username: user.username }),
        ...(user.ip_address != null && { ip_address: user.ip_address }),
        ...(user.name != null && { name: user.name }),
        ...(user.geo != null && { geo: user.geo }),
        ...(user.data != null && { data: user.data })
    };
}

/**
 * @tags: [read]
 * @tagReason: Only reads the events of an issue from Sentry and performs no provider-side mutations.
 * @pitfalls: Setting full to true makes Sentry cap the page size at 10 events per page, silently overriding any larger per_page value.
 */
const action = createAction({
    description: 'List the individual events that make up an issue (group).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/events/list-an-issues-events/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/${encodeURIComponent(input.issue_id)}/events/`,
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.environment !== undefined && { environment: input.environment }),
                ...(input.full !== undefined && { full: input.full ? 'true' : 'false' }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const parsedEvents = z.array(ProviderEventSchema).parse(response.data);

        const parsedHeaders = z.object({ link: z.string().optional() }).safeParse(response.headers);
        const nextCursor = parsedHeaders.success ? parseNextCursor(parsedHeaders.data.link) : undefined;

        const events: z.infer<typeof IssueEventSchema>[] = parsedEvents.map((event) => ({
            id: event.id,
            eventID: event.eventID,
            'event.type': event['event.type'],
            projectID: event.projectID,
            message: event.message,
            title: event.title,
            dateCreated: event.dateCreated,
            tags: event.tags.map((tag) => ({
                key: tag.key,
                value: tag.value,
                ...(tag.query !== undefined && { query: tag.query })
            })),
            metadata: event.metadata,
            ...(event.groupID != null && { groupID: event.groupID }),
            ...(event.location != null && { location: event.location }),
            ...(event.culprit != null && { culprit: event.culprit }),
            ...(event.user != null && { user: mapUser(event.user) }),
            ...(event.platform != null && { platform: event.platform }),
            ...(event.crashFile != null && { crashFile: event.crashFile })
        }));

        return {
            events,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
