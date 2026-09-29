import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().min(1).describe('ID or slug of the Sentry organization. Example: "nangodev".'),
        project: z
            .array(z.string().min(1))
            .optional()
            .describe('Project IDs or slugs to filter by. Omit to include all accessible projects. Example: ["4512170111991808"] or ["nango-seed-project"].'),
        environment: z.array(z.string().min(1)).optional().describe('Environment names to filter by. Example: ["production"].'),
        query: z
            .string()
            .optional()
            .describe(
                'Sentry issue search query. When omitted, Sentry applies the default filter "is:unresolved"; pass an empty string to return issues of all statuses. Example: "is:unresolved level:error".'
            ),
        sort: z
            .enum(['date', 'freq', 'inbox', 'new', 'recommended', 'trends', 'user'])
            .optional()
            .describe(
                'Sort order: "date" (last seen, the default), "new" (first seen), "freq" (event count), "user" (user count), "trends", "inbox" (date added), or "recommended".'
            ),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of issues to return per page (1-100). Defaults to 100.'),
        cursor: z
            .string()
            .regex(/^\d+:-?\d+:\d+$/)
            .optional()
            .describe('Pagination cursor from the nextCursor of a previous response, e.g. "1700000000000:1:0". Omit for the first page.'),
        statsPeriod: z
            .string()
            .optional()
            .describe('Relative time window for the query: a number followed by s, m, h, d, or w (e.g. "24h", "7d"). Overrides start and end.'),
        start: z
            .string()
            .optional()
            .describe('Start of the time window in ISO-8601 format, e.g. "2026-09-01T00:00:00". Only used when statsPeriod is not set.'),
        end: z.string().optional().describe('End of the time window in ISO-8601 format, e.g. "2026-09-29T23:59:59". Only used when statsPeriod is not set.')
    })
    .describe('Filters for listing issues across a Sentry organization.');

const IssueProjectSchema = z.object({
    id: z.string().describe('Numeric project ID as a string. Example: "4512170111991808".'),
    name: z.string().describe('Project name. Example: "Nango Seed Project".'),
    slug: z.string().describe('Project slug. Example: "nango-seed-project".'),
    platform: z.string().nullable().describe('Project platform key (e.g. "node", "python"); null when the project has no platform set.')
});

const IssueAssigneeSchema = z.object({
    type: z.string().describe('Assignee actor type, e.g. "user" or "team".'),
    id: z.string().describe('ID of the assigned user or team.'),
    name: z.string().describe('Display name of the assigned user or team.'),
    email: z.string().optional().describe('Email address of the assigned user. Only present when type is "user".')
});

const IssueSubscriptionDetailsSchema = z.object({
    disabled: z.boolean().optional().describe('True when the subscription is disabled.'),
    reason: z.string().optional().describe('Reason for the subscription, e.g. "bookmarked" or "changed_status".')
});

const IssueAnnotationSchema = z.object({
    displayName: z.string().describe('Display name of the annotation.'),
    url: z.string().describe('URL the annotation links to.')
});

const IssueSchema = z.object({
    id: z.string().describe('Numeric issue ID as a string. Example: "7761433968".'),
    shortId: z.string().describe('Human-readable issue short ID shown in the Sentry UI. Example: "NANGO-SEED-PROJECT-2".'),
    title: z.string().describe('Issue title, e.g. "ValueError: bad input".'),
    culprit: z.string().nullable().describe('Culprit of the issue, typically the offending function and file; null when not set.'),
    permalink: z.string().describe('Web UI URL of the issue.'),
    logger: z.string().nullable().describe('Logger that reported the issue; null when not set.'),
    level: z.string().describe('Severity level of the issue, e.g. "error", "warning", "info", "debug", or "fatal".'),
    status: z.string().describe('Resolution status: "unresolved", "resolved", "ignored", "pending_deletion", "pending_merge", or "reprocessing".'),
    substatus: z
        .string()
        .nullable()
        .describe('Triage substatus, e.g. "new", "ongoing", "regressed", "escalating", or "archived_until_escalating"; null for statuses without a substatus.'),
    isPublic: z.boolean().describe('Whether the issue is publicly shared.'),
    platform: z.string().nullable().describe('Platform key of the issue events (e.g. "node"); null when not set.'),
    priority: z.string().nullable().describe('Issue priority, e.g. "high", "medium", or "low"; null when not set.'),
    project: IssueProjectSchema.describe('Project the issue belongs to.'),
    type: z.string().describe('Issue type, e.g. "error" or "default".'),
    issueCategory: z.string().describe('Issue category, e.g. "error", "performance", or "cron".'),
    issueType: z.string().describe('Fine-grained issue type, e.g. "error" or "performance_n_plus_one_db_queries".'),
    metadata: z
        .object({
            value: z.string().optional().describe('Raw error value of the issue, e.g. "bad input".'),
            type: z.string().optional().describe('Error type of the issue, e.g. "ValueError".'),
            filename: z.string().optional().describe('Filename where the error occurred.'),
            function: z.string().optional().describe('Function where the error occurred.')
        })
        .describe('Issue metadata for error issues.')
        .optional(),
    numComments: z.number().int().describe('Number of comments on the issue.'),
    assignedTo: IssueAssigneeSchema.nullable().describe('User or team the issue is assigned to; null when unassigned.'),
    isBookmarked: z.boolean().describe('Whether the acting user has bookmarked the issue.'),
    isSubscribed: z.boolean().describe('Whether the acting user is subscribed to the issue.'),
    subscriptionDetails: IssueSubscriptionDetailsSchema.nullable().describe('Details of the acting user subscription; null when not subscribed.'),
    hasSeen: z.boolean().describe('Whether the acting user has seen the issue.'),
    annotations: z.array(IssueAnnotationSchema).describe('External annotations linked to the issue.'),
    isUnhandled: z.boolean().describe('Whether the issue was flagged as unhandled by the SDK.'),
    count: z.string().describe('Total number of events in the issue, as a string. Example: "150".'),
    userCount: z.number().int().describe('Number of unique users affected by the issue.'),
    firstSeen: z.string().nullable().describe('ISO-8601 timestamp of when the issue was first seen; null when unknown.'),
    lastSeen: z.string().nullable().describe('ISO-8601 timestamp of when the issue was last seen; null when unknown.')
});

const OutputSchema = z
    .object({
        issues: z.array(IssueSchema).describe('Issues matching the filters, one entry per issue.'),
        nextCursor: z
            .string()
            .optional()
            .describe(
                'Pagination cursor for the next page, taken from the Link response header. Absent when there are no more results; pass it back as the cursor input.'
            )
    })
    .describe('A page of Sentry issues matching the filters, with an optional cursor to fetch the next page.');

function getResponseHeader(headers: unknown, name: string): string | undefined {
    if (typeof headers !== 'object' || headers === null) {
        return undefined;
    }
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === name && typeof value === 'string') {
            return value;
        }
    }
    return undefined;
}

function parseLinkNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    for (const part of linkHeader.split(',')) {
        if (!part.includes('rel="next"')) {
            continue;
        }
        const results = /results="(true|false)"/.exec(part);
        if (!results || results[1] !== 'true') {
            return undefined;
        }
        const cursor = /cursor="([^"]+)"/.exec(part);
        if (cursor && cursor[1]) {
            return cursor[1];
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only performs a GET request that lists Sentry issues; it never mutates provider data.
 * @pitfalls: When query is omitted, Sentry silently applies the default filter is:unresolved, hiding resolved and ignored issues; pass an empty query string to list every status. Filtering by a project the token cannot access fails the whole request with a 403 instead of returning an empty list. There is no updated-since filter, so recency polling must be approximated with search terms such as lastSeen:-24h plus sort=date. Rapid successive calls can hit Sentry rate limits (HTTP 429).
 */
const action = createAction({
    description: 'List issues across a Sentry organization, optionally filtered by projects, environments, time window, or search query.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const queryParts: string[] = [];
        const addParam = (key: string, value: string): void => {
            queryParts.push(`${key}=${encodeURIComponent(value)}`);
        };

        if (input.query !== undefined) {
            addParam('query', input.query);
        }
        if (input.sort !== undefined) {
            addParam('sort', input.sort);
        }
        if (input.limit !== undefined) {
            addParam('limit', String(input.limit));
        }
        if (input.cursor !== undefined) {
            addParam('cursor', input.cursor);
        }
        if (input.statsPeriod !== undefined) {
            addParam('statsPeriod', input.statsPeriod);
        }
        if (input.start !== undefined) {
            addParam('start', input.start);
        }
        if (input.end !== undefined) {
            addParam('end', input.end);
        }
        for (const project of input.project ?? []) {
            addParam('project', project);
        }
        for (const environment of input.environment ?? []) {
            addParam('environment', environment);
        }

        // Sentry accepts repeated project and environment query parameters, which the params object form cannot represent, so the query string is built explicitly.
        // https://docs.sentry.io/api/events/list-an-organizations-issues/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/`,
            ...(queryParts.length > 0 ? { params: queryParts.join('&') } : {}),
            retries: 3
        });

        const issues = z.array(IssueSchema).parse(response.data);
        const nextCursor = parseLinkNextCursor(getResponseHeader(response.headers, 'link'));

        return {
            issues,
            ...(nextCursor !== undefined ? { nextCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
