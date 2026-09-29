import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization the issue belongs to. Example: "nangodev".'),
        issue_id: z
            .string()
            .regex(/^\d+$/, 'issue_id must be a numeric issue ID')
            .describe('Numeric ID of the issue to retrieve (the id field of the issue, not the human-readable shortId). Example: "7761433611".')
    })
    .describe('Input for retrieving a single Sentry issue.');

const IssueProjectSchema = z
    .object({
        id: z.string().describe('Numeric project ID, as a string.'),
        name: z.string().describe('Project name.'),
        slug: z.string().describe('Project slug.'),
        platform: z.string().nullable().optional().describe('Project platform key (e.g. "node", "python"), when set.')
    })
    .describe('Project the issue belongs to.');

const IssueReleaseSchema = z
    .object({
        version: z.string().describe('Full release version string.'),
        shortVersion: z.string().nullable().optional().describe('Shortened release version for display.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the release was created.'),
        dateReleased: z.string().nullable().optional().describe('ISO 8601 timestamp of when the release shipped, or null if not released.'),
        ref: z.string().nullable().optional().describe('Git reference (commit or branch) associated with the release, when set.'),
        url: z.string().nullable().optional().describe('External URL for the release, when set.')
    })
    .describe('Summary of a release associated with the issue.');

const IssueAssigneeSchema = z
    .object({
        type: z.string().describe('Actor type: "user" or "team".'),
        id: z.string().describe('ID of the assigned user or team.'),
        name: z.string().describe('Display name of the assignee.'),
        email: z.string().nullable().optional().describe('Email address, present when the assignee is a user.')
    })
    .describe('User or team the issue is currently assigned to.');

const IssueTagSchema = z
    .object({
        key: z.string().describe('Tag key, e.g. "browser" or "level".'),
        name: z.string().nullable().optional().describe('Human-readable display name of the tag.'),
        totalValues: z.number().nullable().optional().describe('Number of events on this issue carrying this tag.')
    })
    .describe('Tag summary for the issue.');

const IssueActivitySchema = z
    .object({
        id: z.string().describe('Activity entry ID.'),
        type: z.string().describe('Activity type, e.g. "first_seen", "set_resolved" or "note".'),
        dateCreated: z.string().describe('ISO 8601 timestamp of the activity.'),
        data: z.record(z.string(), z.unknown()).optional().describe('Type-specific activity payload.'),
        user: z.unknown().nullable().optional().describe('User who triggered the activity (full Sentry user object), or null for system activity.')
    })
    .describe('Single entry from the issue activity log.');

const IssueStatsSchema = z
    .object({
        '24h': z.array(z.array(z.number()).length(2)).describe('Hourly [unix timestamp, event count] buckets for the last 24 hours.'),
        '30d': z.array(z.array(z.number()).length(2)).describe('Daily [unix timestamp, event count] buckets for the last 30 days.')
    })
    .describe('Event-volume time series for the issue.');

const IssueSchema = z
    .object({
        id: z.string().describe('Numeric issue ID, as a string. This is the ID required by other issue endpoints.'),
        shareId: z.string().nullable().optional().describe('Public share ID, present only when the issue has been shared publicly.'),
        shortId: z.string().describe('Human-readable issue identifier shown in the Sentry UI, e.g. "NANGO-SEED-PROJECT-1".'),
        title: z.string().describe('Issue title, typically the error message.'),
        culprit: z.string().describe('Function or location that caused the issue, e.g. "runner in main".'),
        permalink: z.string().nullable().optional().describe('Web URL of the issue in Sentry.'),
        logger: z.string().nullable().optional().describe('Logger that reported the events, when set.'),
        level: z.string().describe('Severity level of the issue, e.g. "error" or "warning".'),
        status: z.string().describe('Resolution status: "unresolved", "resolved" or "ignored".'),
        statusDetails: z.record(z.string(), z.unknown()).describe('Extra detail about the current status (e.g. "inNextRelease"); empty object when none.'),
        substatus: z.string().nullable().optional().describe('Sub-status for unresolved issues (e.g. "ongoing" or "escalating"); null when resolved.'),
        isPublic: z.boolean().describe('Whether the issue is publicly shared.'),
        platform: z.string().nullable().optional().describe('Platform key of the events in this issue, e.g. "node".'),
        priority: z.string().nullable().optional().describe('Issue priority, e.g. "high", "medium" or "low".'),
        priorityLockedAt: z.string().nullable().optional().describe('ISO 8601 timestamp of when the priority was manually locked, when it has been.'),
        seerFixabilityScore: z.number().nullable().optional().describe('Seer AI fixability score between 0 and 1, when computed.'),
        seerAutofixLastTriggered: z.string().nullable().optional().describe('ISO 8601 timestamp of the last Seer autofix run, when triggered.'),
        seerExplorerAutofixLastTriggered: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of the last Seer Explorer autofix run, when triggered.'),
        project: IssueProjectSchema,
        type: z.string().describe('Detector type that created the issue, e.g. "error" for error issues.'),
        issueType: z.string().nullable().optional().describe('Specific issue type slug within the category, e.g. "error".'),
        issueCategory: z.string().describe('Issue category, e.g. "error", "performance" or "cron".'),
        metadata: z.record(z.string(), z.unknown()).describe('Issue-type-specific metadata such as title, value or filename.'),
        numComments: z.number().describe('Number of comments on the issue.'),
        assignedTo: IssueAssigneeSchema.nullable().optional().describe('Current assignee, or null/absent when unassigned.'),
        isBookmarked: z.boolean().describe("Whether the token's user has bookmarked the issue."),
        isSubscribed: z.boolean().describe("Whether the token's user is subscribed to the issue."),
        subscriptionDetails: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional()
            .describe("Why the token's user is subscribed, or null when not subscribed."),
        hasSeen: z.boolean().describe("Whether the token's user has viewed the issue."),
        annotations: z.array(z.string()).describe('Display annotations, e.g. rendered links to externally tracked issues.'),
        count: z.string().describe('Total number of events grouped into this issue, as a numeric string.'),
        userCount: z.number().describe('Number of unique users affected by the issue.'),
        firstSeen: z.string().describe('ISO 8601 timestamp of the first event in this issue.'),
        lastSeen: z.string().describe('ISO 8601 timestamp of the most recent event in this issue.'),
        activity: z.array(IssueActivitySchema).describe('Activity log entries for the issue, oldest first.'),
        seenBy: z.array(z.unknown()).describe('Users who have viewed the issue (full Sentry user objects).'),
        userReportCount: z.number().describe('Number of user feedback reports attached to the issue.'),
        participants: z.array(z.unknown()).describe('Users participating in the issue (full Sentry user objects).'),
        firstRelease: IssueReleaseSchema.nullable().optional().describe('First release the issue was seen in, when release data applies.'),
        lastRelease: IssueReleaseSchema.nullable().optional().describe('Most recent release the issue was seen in, when release data applies.'),
        tags: z.array(IssueTagSchema).describe('Per-tag summaries for the issue.'),
        stats: IssueStatsSchema.describe('Event-volume statistics for the issue.')
    })
    .describe('Details of a single Sentry issue, including basic stats, comment/user-report counts and latest-event context.');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET request for one issue and mutates nothing on the provider.
 * @pitfalls: issue_id must be the numeric issue ID, not the human-readable shortId (e.g. "PROJECT-1") shown in the Sentry UI. The count field is returned as a numeric string, not a number.
 */
const action = createAction({
    description: 'Retrieve details of a single Sentry issue, including its stats, comment/user-report counts and latest event context.',
    version: '1.0.0',
    input: InputSchema,
    output: IssueSchema,
    scopes: ['event:read'],

    exec: async (nango, input): Promise<z.infer<typeof IssueSchema>> => {
        // https://docs.sentry.io/api/events/retrieve-an-issue/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/${encodeURIComponent(input.issue_id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Issue not found',
                issue_id: input.issue_id,
                organization_id_or_slug: input.organization_id_or_slug
            });
        }

        return IssueSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
