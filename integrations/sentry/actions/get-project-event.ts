import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization the project belongs to. Example: "my-org"'),
        project_id_or_slug: z
            .string()
            .describe('ID or slug of the project the event belongs to. Project slugs are unique within an organization. Example: "my-project"'),
        event_id: z
            .string()
            .describe(
                'ID of the event to retrieve; a 32-character hexadecimal string as reported by the SDK client. Example: "9999aaaaca8b46d797c23c6077c6ff01"'
            )
    })
    .describe('Identifies the project and the single event to retrieve.');

const EventTagSchema = z.object({
    key: z.string().describe('Tag key. Example: "browser"'),
    value: z.string().describe('Tag value. Example: "Chrome 83.0.4103"'),
    query: z.string().optional().describe('Optional search query Sentry attaches to this tag')
});

const EventErrorSchema = z.object({
    type: z.string().describe('Machine-readable processing error type. Example: "js_invalid_sourcemap_location"'),
    message: z.string().describe('Human-readable description of the processing error'),
    data: z.record(z.string(), z.unknown()).describe('Structured details about the processing error; shape varies by error type')
});

const EventEntrySchema = z.object({
    type: z.string().describe('Entry type. Examples: "exception", "message", "breadcrumbs", "request", "threads", "spans"'),
    data: z
        .unknown()
        .describe(
            'Entry payload; shape depends on the entry type (exception values with stacktrace frames, rendered message, breadcrumb list, HTTP request details, etc.)'
        )
});

const EventUserSchema = z.object({
    id: z.string().nullable().optional().describe('ID of the affected user, if the SDK reported one'),
    email: z.string().nullable().optional().describe('Email of the affected user, if reported'),
    username: z.string().nullable().optional().describe('Username of the affected user, if reported'),
    ip_address: z.string().nullable().optional().describe('IP address of the affected user, if reported'),
    name: z.string().nullable().optional().describe('Display name of the affected user, if reported'),
    geo: z.record(z.string(), z.string()).nullable().optional().describe('Derived geolocation of the user (country_code, city, region), if available'),
    data: z.record(z.string(), z.unknown()).nullable().optional().describe('Additional custom user attributes reported by the SDK')
});

const EventSdkSchema = z.object({
    name: z.string().nullable().describe('Name of the SDK that sent the event. Example: "sentry.javascript.browser"'),
    version: z.string().nullable().describe('Version of the SDK that sent the event. Example: "5.17.0"')
});

const EventGroupingConfigSchema = z.object({
    id: z.string().describe('Grouping configuration ID used to group this event into an issue'),
    enhancements: z.string().describe('Grouping enhancements applied when grouping this event')
});

const EventLastDeploySchema = z.object({
    id: z.string().describe('ID of the deploy'),
    name: z.string().describe('Name of the deploy'),
    environment: z.string().describe('Environment the release was deployed to. Example: "production"'),
    dateFinished: z.string().describe('ISO 8601 timestamp when the deploy finished'),
    dateStarted: z.string().nullable().optional().describe('ISO 8601 timestamp when the deploy started, if recorded'),
    url: z.string().nullable().optional().describe('URL of the deploy, if recorded')
});

const EventReleaseSchema = z.object({
    id: z.number().optional().describe('Numeric ID of the release'),
    version: z.string().nullable().optional().describe('Version string of the release associated with the event. Example: "1.0.0"'),
    status: z.string().optional().describe('Status of the release. Examples: "open", "archived"'),
    ref: z.string().nullable().optional().describe('Git reference (commit SHA or tag) the release points to, if set'),
    url: z.string().nullable().optional().describe('URL of the release, if set'),
    userAgent: z.string().nullable().optional().describe('User agent that created the release, if recorded'),
    dateCreated: z.string().optional().describe('ISO 8601 timestamp when the release was created'),
    dateReleased: z.string().nullable().optional().describe('ISO 8601 timestamp when the release was finalized, if set'),
    commitCount: z.number().optional().describe('Number of commits associated with the release'),
    deployCount: z.number().optional().describe('Number of deploys recorded for the release'),
    data: z.record(z.string(), z.unknown()).optional().describe('Additional release metadata'),
    lastCommit: z.record(z.string(), z.unknown()).nullable().optional().describe('Last commit associated with the release, if any'),
    lastDeploy: EventLastDeploySchema.nullable().optional().describe('Most recent deploy of the release, if any'),
    versionInfo: z.record(z.string(), z.unknown()).nullable().optional().describe('Parsed version information for the release, if derivable')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the event within the project'),
        eventID: z.string().describe('32-character hexadecimal event ID reported by the client'),
        groupID: z.string().nullable().describe('Numeric ID of the issue (group) this event belongs to, if grouped'),
        projectID: z.string().describe('Numeric ID of the project the event belongs to'),
        type: z.string().describe('Event type. Examples: "error", "transaction", "default", "csp", "generic", "feedback"'),
        title: z.string().describe('Human-readable title of the event'),
        message: z.string().nullable().describe('Event message; may be an empty string when the event carries no message'),
        platform: z.string().describe('Platform of the SDK that sent the event. Example: "javascript"'),
        culprit: z.string().nullable().optional().describe('Function or location Sentry considers the culprit, if determined'),
        location: z.string().nullable().describe('File and line where the event occurred, if determinable. Example: "example.py:123"'),
        dist: z.string().nullable().describe('Distribution of the application the event came from, if reported'),
        size: z.number().nullable().describe('Size of the event payload in bytes'),
        dateCreated: z.string().optional().describe('ISO 8601 timestamp when the event was created'),
        dateReceived: z.string().nullable().describe('ISO 8601 timestamp when Sentry received the event'),
        startTimestamp: z.number().optional().describe('Unix timestamp (seconds) when the event started; set on transaction events'),
        endTimestamp: z.number().optional().describe('Unix timestamp (seconds) when the event ended; set on transaction events'),
        previousEventID: z.string().nullable().describe('ID of the previous event in the same issue, if any'),
        nextEventID: z.string().nullable().describe('ID of the next event in the same issue, if any'),
        crashFile: z.string().nullable().optional().describe('Reference to an associated crash file, if any'),
        metadata: z.record(z.string(), z.unknown()).describe('Event metadata such as the exception type and value used for display'),
        tags: z.array(EventTagSchema).describe('Tags attached to the event'),
        errors: z.array(EventErrorSchema).describe('Processing errors Sentry encountered while ingesting the event'),
        entries: z.array(EventEntrySchema).describe('Full event payload entries (exception with stacktrace, message, breadcrumbs, request, etc.)'),
        user: EventUserSchema.nullable().describe('User associated with the event, if the SDK reported one'),
        sdk: EventSdkSchema.nullable().describe('SDK that sent the event, if known'),
        contexts: z.record(z.string(), z.unknown()).nullable().describe('Structured contexts attached to the event (browser, os, trace, etc.)'),
        context: z.record(z.string(), z.unknown()).nullable().describe('Legacy unstructured contexts attached to the event'),
        packages: z.record(z.string(), z.unknown()).describe('Packages/modules with versions loaded when the event was captured'),
        fingerprints: z.array(z.string()).optional().describe('Grouping fingerprints used to assign the event to an issue'),
        release: EventReleaseSchema.nullable().describe('Release associated with the event, if any'),
        groupingConfig: EventGroupingConfigSchema.optional().describe('Grouping configuration used for this event'),
        occurrence: z.record(z.string(), z.unknown()).nullable().describe('Issue occurrence details for occurrence-backed issues, if any'),
        resolvedWith: z.array(z.string()).describe('Mechanisms the issue this event belongs to was resolved with; empty if not applicable'),
        sdkUpdates: z.array(z.record(z.string(), z.unknown())).describe('Suggested SDK updates relevant to the event'),
        userReport: z.record(z.string(), z.unknown()).nullable().describe('User feedback report attached to the event, if any'),
        measurements: z.record(z.string(), z.unknown()).nullable().optional().describe('Performance measurements on the event (transactions only), if any'),
        breakdowns: z.record(z.string(), z.unknown()).nullable().optional().describe('Operation breakdowns for the event (transactions only), if any'),
        _meta: z.record(z.string(), z.unknown()).describe('Per-field redaction and normalization metadata produced during ingestion')
    })
    .describe('Full payload of a single Sentry event, including its entries (exception, message, breadcrumbs, request).');

/**
 * Retrieves the full payload of a single Sentry event by project and event ID.
 *
 * @tags: [read]
 * @tagReason: Performs a single read-only GET against the Sentry API and mutates nothing.
 * @pitfalls: event_id must be the event's 32-character hexadecimal ID as reported by the SDK, not the owning issue's numeric ID or shortId; a wrong identifier returns a 404.
 */
const action = createAction({
    description: "Retrieve a single event's full payload by project and event ID",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/events/retrieve-an-event-for-a-project/
        const response = await nango.get({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/events/${encodeURIComponent(input.event_id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found',
                event_id: input.event_id
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
