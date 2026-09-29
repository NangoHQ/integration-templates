import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the issue belongs to. Example: "nangodev"'),
        issue_id: z.string().describe('The numeric ID of the issue the event belongs to. Example: "7761433611"'),
        event_id: z
            .string()
            .describe(
                'The ID of the event to retrieve, or the special values "latest", "oldest", or "recommended". Example: "63be9f2fdd3f438d951b2bae4e847b51"'
            )
    })
    .describe('Input identifying the organization, issue, and event to retrieve.');

const EventUserSchema = z
    .object({
        id: z.string().nullable().optional().describe('ID of the user associated with the event. Example: "42"'),
        email: z.string().nullable().optional().describe('Email of the user associated with the event. Example: "jane@example.com"'),
        username: z.string().nullable().optional().describe('Username of the user associated with the event. Example: "janedoe"'),
        ip_address: z.string().nullable().optional().describe('IP address of the user associated with the event. Example: "203.0.113.10"'),
        name: z.string().nullable().optional().describe('Display name of the user associated with the event. Example: "Jane Doe"'),
        geo: z.record(z.string(), z.string()).nullable().optional().describe('Geographic information derived from the user IP address, keyed by geo field'),
        data: z.record(z.string(), z.unknown()).nullable().optional().describe('Additional arbitrary user attributes attached to the event')
    })
    .passthrough();

const EventTagSchema = z
    .object({
        key: z.string().describe('Tag key. Example: "environment"'),
        value: z.string().describe('Tag value. Example: "production"'),
        query: z.string().optional().describe('Pre-built issue-search query for this tag, when provided by Sentry')
    })
    .passthrough();

const EventEntrySchema = z
    .object({
        type: z.string().describe('Entry interface type, e.g. "exception", "message", "stacktrace", "breadcrumbs", or "request". Example: "exception"'),
        data: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Entry payload; for "exception" entries this holds values[] with the exception type, value, and stacktrace frames')
    })
    .passthrough();

const EventErrorSchema = z
    .object({
        type: z.string().describe('Processing error type. Example: "invalid_data"'),
        message: z.string().optional().describe('Human-readable message describing the processing error'),
        data: z.record(z.string(), z.unknown()).optional().describe('Additional structured details about the processing error')
    })
    .passthrough();

const EventSdkSchema = z
    .object({
        name: z.string().nullable().optional().describe('Name of the SDK that captured the event. Example: "sentry.javascript.node"'),
        version: z.string().nullable().optional().describe('Version of the SDK that captured the event. Example: "7.120.0"')
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the event. Example: "63be9f2fdd3f438d951b2bae4e847b51"'),
        groupID: z.string().nullable().optional().describe('ID of the issue (group) this event belongs to. Example: "7761433611"'),
        eventID: z.string().optional().describe('Hexadecimal ID of the event, matching the requested event_id. Example: "63be9f2fdd3f438d951b2bae4e847b51"'),
        projectID: z.string().optional().describe('ID of the project the event was ingested into. Example: "4512170111991808"'),
        message: z.string().nullable().optional().describe('Event message. Example: "TypeError: undefined is not a function"'),
        title: z.string().optional().describe('Display title of the event. Example: "TypeError: undefined is not a function"'),
        location: z.string().nullable().optional().describe('Primary source location of the event, such as a file path and line. Example: "index.js:12"'),
        culprit: z.string().nullable().optional().describe('Function or module Sentry identified as the culprit. Example: "main in app.js"'),
        user: EventUserSchema.nullable().optional().describe('User associated with the event, if any'),
        tags: z.array(EventTagSchema).optional().describe('Tags attached to the event'),
        platform: z.string().optional().describe('Platform of the SDK that sent the event. Example: "node"'),
        type: z.string().optional().describe('Event type, e.g. "error", "transaction", "csp", or "default". Example: "error"'),
        dateCreated: z.string().optional().describe('ISO 8601 timestamp when the event was created. Example: "2026-09-29T12:00:00Z"'),
        dateReceived: z.string().nullable().optional().describe('ISO 8601 timestamp when Sentry received the event. Example: "2026-09-29T12:00:01Z"'),
        startTimestamp: z.number().optional().describe('Unix timestamp marking the start of the event, present on transaction events'),
        endTimestamp: z.number().optional().describe('Unix timestamp marking the end of the event, present on transaction events'),
        contexts: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional()
            .describe('Structured contexts such as device, os, runtime, browser, and trace, keyed by context name'),
        context: z.record(z.string(), z.unknown()).nullable().optional().describe('Additional arbitrary context data attached to the event'),
        entries: z.array(EventEntrySchema).optional().describe('Event interface entries; "exception" entries carry the stacktrace'),
        errors: z.array(EventErrorSchema).optional().describe('Processing errors Sentry encountered while ingesting the event'),
        metadata: z.record(z.string(), z.unknown()).optional().describe('Event metadata used for display, such as title fragments and culprit location'),
        fingerprints: z.array(z.string()).optional().describe('Grouping fingerprints used to assign the event to its issue'),
        dist: z.string().nullable().optional().describe('Distribution of the application, when set on the event. Example: "42"'),
        sdk: EventSdkSchema.nullable().optional().describe('SDK that captured the event'),
        packages: z.record(z.string(), z.unknown()).optional().describe('Modules or packages loaded at event time, keyed by package name'),
        release: z.record(z.string(), z.unknown()).nullable().optional().describe('Release associated with the event, if any'),
        size: z.number().nullable().optional().describe('Size of the stored event payload in bytes. Example: "1823"'),
        groupingConfig: z.record(z.string(), z.unknown()).optional().describe('Grouping configuration that placed the event into its issue'),
        occurrence: z.record(z.string(), z.unknown()).nullable().optional().describe('Issue-platform occurrence data, present on occurrence-backed events'),
        nextEventID: z.string().nullable().optional().describe('ID of the next event in the issue, when available'),
        previousEventID: z.string().nullable().optional().describe('ID of the previous event in the issue, when available'),
        userReport: z.record(z.string(), z.unknown()).nullable().optional().describe('User feedback report attached to the event, if any')
    })
    .passthrough()
    .describe('A Sentry event with its full payload, including message, exception/stacktrace entries, tags, user, and contexts.');

/**
 * @tags: [read]
 * @tagReason: Only retrieves an existing event from Sentry without mutating any provider state.
 */
const action = createAction({
    description: 'Retrieve a single event belonging to an issue, with full payload (message, exception, stacktrace, tags, user, contexts).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/events/retrieve-an-issue-event/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/${encodeURIComponent(input.issue_id)}/events/${encodeURIComponent(input.event_id)}/`,
            retries: 3
        };
        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
