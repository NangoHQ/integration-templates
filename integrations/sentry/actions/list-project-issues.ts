import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization that owns the project. Example: "acme".'),
        project_id_or_slug: z.string().describe('ID or slug of the project whose issues are listed. Example: "my-backend".'),
        query: z
            .string()
            .optional()
            .describe(
                'Sentry structured search query. When omitted, an implied "is:unresolved" filter is applied; pass an empty string to return issues of any status. Example: "is:unresolved level:error".'
            ),
        sort: z
            .enum(['date', 'new', 'trends', 'freq', 'user', 'recommended'])
            .optional()
            .describe('Sort order: "date" last seen (default), "new" first seen, "trends", "freq" event volume, "user" affected users, or "recommended".'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of issues to return. The API maximum is 100.'),
        cursor: z
            .string()
            .regex(/^-?\d+(?:\.\d+)?:-?\d+:-?\d+$/)
            .optional()
            .describe('Pagination cursor returned as nextCursor by a previous call. Omit for the first page. Example: "1698232400000:0:0".'),
        shortIdLookup: z
            .boolean()
            .optional()
            .describe(
                'Set to true to also resolve short IDs (e.g. "MY-PROJECT-1") in the query; the result may then include an issue from a different project.'
            )
    })
    .describe('Input for listing the issues of a single Sentry project.');

const IssueProjectSchema = z
    .object({
        id: z.string().describe('Numeric ID of the project. Example: "4504167279476736".'),
        name: z.string().describe('Display name of the project.'),
        slug: z.string().describe('URL-friendly slug of the project.')
    })
    .describe('Project the issue belongs to.');

const IssueActorSchema = z
    .object({
        type: z.string().optional().describe('Actor type, e.g. "user" or "team".'),
        id: z.string().optional().describe('ID of the user or team the issue is assigned to.'),
        name: z.string().nullable().optional().describe('Display name of the user or team.'),
        email: z.string().nullable().optional().describe('Email address when the assignee is a user.')
    })
    .nullable()
    .optional()
    .describe('User or team the issue is assigned to; null when unassigned.');

const IssueSchema = z
    .object({
        id: z.string().describe('Numeric issue ID, serialized as a string. Use this for issue-scoped endpoints. Example: "1234567890".'),
        shortId: z.string().optional().describe('Human-readable issue identifier shown in the Sentry UI. Example: "MY-PROJECT-2".'),
        title: z.string().optional().describe('Issue title, usually the error message or a summary of the problem.'),
        culprit: z.string().optional().describe('Function or code location Sentry considers the culprit.'),
        type: z.string().optional().describe('Event type of the issue, e.g. "error" or "default".'),
        issueCategory: z.string().optional().describe('Issue category, e.g. "error", "performance", or "feedback".'),
        level: z.string().optional().describe('Severity level of the issue, e.g. "error", "warning", or "info".'),
        status: z.string().optional().describe('Resolution status, e.g. "unresolved", "resolved", or "ignored".'),
        substatus: z.string().nullable().optional().describe('Sub-status such as "new", "ongoing", "regressed", or "archived"; null when none applies.'),
        count: z.string().optional().describe('Total number of events in the issue, serialized as a string. Example: "42".'),
        userCount: z.number().optional().describe('Number of distinct users affected by the issue.'),
        numComments: z.number().optional().describe('Number of comments on the issue.'),
        firstSeen: z.string().optional().describe('ISO 8601 timestamp of when the issue was first seen.'),
        lastSeen: z.string().optional().describe('ISO 8601 timestamp of when the issue was last seen.'),
        platform: z.string().optional().describe('Platform of the project that produced the issue, e.g. "node".'),
        logger: z.string().nullable().optional().describe('Logger that reported the events; null when not set.'),
        isBookmarked: z.boolean().optional().describe('Whether the issue is bookmarked.'),
        isPublic: z.boolean().optional().describe('Whether the issue has been shared publicly.'),
        isSubscribed: z.boolean().optional().describe('Whether the current user is subscribed to the issue.'),
        isUnhandled: z.boolean().optional().describe('Whether the issue was captured from an unhandled exception.'),
        hasSeen: z.boolean().optional().describe('Whether the current user has seen the issue.'),
        priority: z.string().optional().describe('Issue priority, e.g. "high", "medium", or "low".'),
        permalink: z.string().optional().describe('Web URL of the issue in Sentry.'),
        shareId: z.string().nullable().optional().describe('Public share link ID; null when the issue is not shared.'),
        annotations: z
            .array(z.unknown())
            .optional()
            .describe('Annotations attached to the issue, such as linked external references; entries may be strings or objects.'),
        metadata: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Issue-type-specific metadata, e.g. value, type, filename, or function for error issues.'),
        statusDetails: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Additional details about the current status; an empty object when there are none.'),
        assignedTo: IssueActorSchema,
        project: IssueProjectSchema.optional()
    })
    .describe('A Sentry issue (group of similar events) bound to the project.');

const OutputSchema = z
    .object({
        issues: z.array(IssueSchema).describe('Issues of the project that match the query.'),
        nextCursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page; absent when there are no more results.')
    })
    .describe('A page of project issues with cursor-based pagination state.');

function parseNextCursor(linkHeader: string): string | undefined {
    const links = linkHeader.split(',');
    for (const link of links) {
        const parts = link.split(';').map((part) => part.trim());
        if (!parts.includes('rel="next"')) {
            continue;
        }
        if (!parts.includes('results="true"')) {
            return undefined;
        }
        const cursorPart = parts.find((part) => part.startsWith('cursor="'));
        if (!cursorPart || !cursorPart.endsWith('"')) {
            return undefined;
        }
        const cursor = cursorPart.slice('cursor="'.length, -1);
        return cursor === '' ? undefined : cursor;
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to list a project's issues; it creates, updates, or deletes nothing in Sentry.
 * @pitfalls: Without an explicit query Sentry applies an implicit is:unresolved filter, so pass an empty query string to list issues of all statuses. Enabling shortIdLookup can return an issue that belongs to a different project.
 */
const action = createAction({
    description: 'List issues bound to a single project, with optional search query, sorting, and cursor pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/events/list-a-projects-issues/
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/issues/`,
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.shortIdLookup === true && { shortIdLookup: '1' })
            },
            retries: 3
        };
        const response = await nango.get<unknown>(config);

        const issues = z.array(IssueSchema).parse(response.data);

        const linkHeader = response.headers['link'];
        const nextCursor = typeof linkHeader === 'string' ? parseNextCursor(linkHeader) : undefined;

        return {
            issues,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
