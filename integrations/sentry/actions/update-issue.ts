import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization the issue belongs to. Example: "nangodev"'),
        issue_id: z.string().describe('Numeric ID of the issue to update (not the human-readable shortId). Example: "7761433968"'),
        status: z.enum(['resolved', 'unresolved', 'ignored', 'resolvedInNextRelease', 'muted']).optional().describe('New status for the issue.'),
        statusDetails: z
            .object({
                inNextRelease: z.boolean().optional().describe('If true, marks the issue as resolved in the next release.'),
                inRelease: z
                    .string()
                    .optional()
                    .describe('Version of the release the issue should be resolved in. If set to "latest", the latest release is used.'),
                inCommit: z
                    .object({
                        commit: z.string().describe('SHA of the resolving commit.'),
                        repository: z.string().describe('Name of the repository, as it appears in Sentry.')
                    })
                    .optional()
                    .describe('Commit the issue should be resolved in.'),
                ignoreDuration: z.number().int().min(0).optional().describe('Ignore the issue for this many minutes.'),
                ignoreCount: z.number().int().min(0).optional().describe('Ignore the issue until it has occurred this many times within ignoreWindow minutes.'),
                ignoreWindow: z
                    .number()
                    .int()
                    .min(0)
                    .max(10080)
                    .optional()
                    .describe('Window in minutes over which ignoreCount is measured. Maximum: 10080 (7 days).'),
                ignoreUserCount: z
                    .number()
                    .int()
                    .min(0)
                    .optional()
                    .describe('Ignore the issue until it has affected this many users within ignoreUserWindow minutes.'),
                ignoreUserWindow: z
                    .number()
                    .int()
                    .min(0)
                    .max(10080)
                    .optional()
                    .describe('Window in minutes over which ignoreUserCount is measured. Maximum: 10080 (7 days).')
            })
            .optional()
            .describe(
                'Additional details about the resolution, e.g. resolving in a release or commit, or ignore conditions. Status detail updates that include release data are only allowed for issues within a single project.'
            ),
        assignedTo: z
            .string()
            .optional()
            .describe(
                'User or team to assign the issue to. Accepted forms: "<user_id>", "user:<user_id>", "<username>", "<user_primary_email>", or "team:<team_id>".'
            ),
        isBookmarked: z.boolean().optional().describe('If true, bookmarks the issue for the requestor.'),
        isSubscribed: z.boolean().optional().describe('If true, subscribes the requestor to the issue.'),
        isPublic: z.boolean().optional().describe('If true, publishes the issue.'),
        inbox: z.boolean().optional().describe('If true, marks the issue as reviewed by the requestor.')
    })
    .describe('Input for updating a Sentry issue. Only the provided attributes are modified.');

const AssignedToSchema = z.object({
    type: z.string().describe('Type of the assignee. One of: "user", "team".'),
    id: z.string().describe('ID of the assigned user or team. Example: "15174593"'),
    name: z.string().describe('Display name of the assigned user or team.'),
    email: z.string().optional().describe('Email of the assigned user. Only present for user assignees.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Numeric ID of the issue. Example: "7761433968"'),
        shortId: z.string().describe('Human-readable short ID of the issue, as shown in the Sentry UI. Example: "NANGO-SEED-PROJECT-2"'),
        title: z.string().describe('Title of the issue.'),
        culprit: z.string().optional().describe('Function or module that caused the issue. Example: "raven.scripts.runner in main"'),
        permalink: z.string().describe('URL of the issue in the Sentry UI.'),
        level: z.string().describe('Severity level of the issue. Example: "error"'),
        status: z.string().describe('Status of the issue after the update. Example: "resolved"'),
        substatus: z.string().optional().describe('Substatus of the issue after the update. Example: "ongoing"'),
        statusDetails: z
            .record(z.string(), z.unknown())
            .describe('Details about the current resolution or ignore state of the issue, as returned by Sentry. Empty object when there are no details.'),
        priority: z.string().optional().describe('Priority of the issue. One of: "low", "medium", "high".'),
        isPublic: z.boolean().describe('Whether the issue is publicly shared.'),
        isBookmarked: z.boolean().describe('Whether the issue is bookmarked by the requestor.'),
        isSubscribed: z.boolean().describe('Whether the requestor is subscribed to the issue.'),
        hasSeen: z.boolean().describe('Whether the issue has been seen by the requestor.'),
        assignedTo: AssignedToSchema.optional().describe('User or team the issue is assigned to. Omitted when the issue is unassigned.'),
        project: z
            .object({
                id: z.string().describe('ID of the project the issue belongs to. Example: "4512170111991808"'),
                name: z.string().describe('Name of the project.'),
                slug: z.string().describe('Slug of the project. Example: "nango-seed-project"'),
                platform: z.string().optional().describe('Platform of the project. Example: "node"')
            })
            .describe('Project the issue belongs to.'),
        platform: z.string().optional().describe('Platform of the issue events. Example: "node"'),
        count: z.string().optional().describe('Total number of events in the issue, as a string. Example: "150"'),
        userCount: z.number().optional().describe('Number of unique users affected by the issue.'),
        firstSeen: z.string().optional().describe('ISO 8601 timestamp of when the issue was first seen.'),
        lastSeen: z.string().optional().describe('ISO 8601 timestamp of when the issue was last seen.')
    })
    .describe('The updated Sentry issue.');

const ProviderIssueSchema = z.object({
    id: z.string(),
    shortId: z.string(),
    title: z.string(),
    culprit: z.string().nullable(),
    permalink: z.string(),
    level: z.string(),
    status: z.string(),
    substatus: z.string().nullable(),
    statusDetails: z.record(z.string(), z.unknown()),
    priority: z.string().nullable(),
    isPublic: z.boolean(),
    isBookmarked: z.boolean(),
    isSubscribed: z.boolean(),
    hasSeen: z.boolean(),
    assignedTo: AssignedToSchema.nullable(),
    project: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        platform: z.string().nullable()
    }),
    platform: z.string().nullable(),
    count: z.string().optional(),
    userCount: z.number().optional(),
    firstSeen: z.string().nullable().optional(),
    lastSeen: z.string().nullable().optional()
});

/**
 * @tags: [write]
 * @tagReason: Mutates an issue's status, assignment, bookmark, or subscription state via a PUT request to Sentry.
 * @pitfalls: Resolving an issue implicitly subscribes the requestor to it, so isSubscribed can return true even when it was not requested. The auth token must have the event:write or event:admin scope.
 */
const action = createAction({
    description: "Update an issue's status, assignment, bookmark, or subscription state.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/events/update-an-issue/
        const response = await nango.put({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/${encodeURIComponent(input.issue_id)}/`,
            data: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.statusDetails !== undefined && { statusDetails: input.statusDetails }),
                ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
                ...(input.isBookmarked !== undefined && { isBookmarked: input.isBookmarked }),
                ...(input.isSubscribed !== undefined && { isSubscribed: input.isSubscribed }),
                ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
                ...(input.inbox !== undefined && { inbox: input.inbox })
            },
            // State-setting update: retrying a lost response re-applies the same attribute values. The workspace proxy-call-retries lint rule requires a positive integer, so 0 is not permitted here.
            retries: 3
        });

        const issue = ProviderIssueSchema.parse(response.data);

        return {
            id: issue.id,
            shortId: issue.shortId,
            title: issue.title,
            ...(issue.culprit != null && { culprit: issue.culprit }),
            permalink: issue.permalink,
            level: issue.level,
            status: issue.status,
            ...(issue.substatus != null && { substatus: issue.substatus }),
            statusDetails: issue.statusDetails,
            ...(issue.priority != null && { priority: issue.priority }),
            isPublic: issue.isPublic,
            isBookmarked: issue.isBookmarked,
            isSubscribed: issue.isSubscribed,
            hasSeen: issue.hasSeen,
            ...(issue.assignedTo != null && { assignedTo: issue.assignedTo }),
            project: {
                id: issue.project.id,
                name: issue.project.name,
                slug: issue.project.slug,
                ...(issue.project.platform != null && { platform: issue.project.platform })
            },
            ...(issue.platform != null && { platform: issue.platform }),
            ...(issue.count !== undefined && { count: issue.count }),
            ...(issue.userCount !== undefined && { userCount: issue.userCount }),
            ...(issue.firstSeen != null && { firstSeen: issue.firstSeen }),
            ...(issue.lastSeen != null && { lastSeen: issue.lastSeen })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
