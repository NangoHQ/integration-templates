import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const StatusDetailsInputSchema = z
    .object({
        inNextRelease: z.boolean().optional().describe('If true, marks the issues as resolved in the next release.'),
        inRelease: z.string().optional().describe('Release version the issues are resolved in. The value "latest" resolves them in the most recent release.'),
        inCommit: z
            .object({
                commit: z.string().describe('SHA of the resolving commit. Example: "2bcba4a1e2932e7b3a0fdd2a68d20c34e8f1a2b3".'),
                repository: z.string().describe('Name of the repository as it appears in Sentry. Example: "my-org/my-repo".')
            })
            .optional()
            .describe('Commit the issues should be marked as resolved in.'),
        ignoreDuration: z.number().int().min(0).optional().describe('Ignore the issues for this many minutes.'),
        ignoreCount: z.number().int().min(0).optional().describe('Ignore the issues until each has occurred this many times within ignoreWindow minutes.'),
        ignoreWindow: z.number().int().min(0).max(10080).optional().describe('Window in minutes over which ignoreCount is measured. Maximum 10080 (1 week).'),
        ignoreUserCount: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Ignore the issues until each has affected this many users within ignoreUserWindow minutes.'),
        ignoreUserWindow: z
            .number()
            .int()
            .min(0)
            .max(10080)
            .optional()
            .describe('Window in minutes over which ignoreUserCount is measured. Maximum 10080 (1 week).')
    })
    .describe('Additional details about the resolution. Status detail updates that include release data are only allowed for issues within a single project.');

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the issues belong to. Example: "my-org".'),
        ids: z
            .array(z.number().int().positive())
            .max(1000)
            .optional()
            .describe(
                'Numeric issue IDs to update, sent as repeated id query parameters. Required for non-status updates; optional for status updates, where omitting it updates all issues matching the filters. Maximum 1000. Example: [123456789].'
            ),
        query: z
            .string()
            .optional()
            .describe(
                'Search query selecting issues when ids is omitted (status updates only). The provider defaults to "is:unresolved" when unset; pass an empty string to match all issues. Example: "is:unresolved browser:Chrome".'
            ),
        project: z
            .array(z.string())
            .optional()
            .describe(
                'Project IDs or slugs restricting the selection. Omit to include all accessible projects; "-1" also selects all accessible projects. Example: ["web-frontend", "123456789"].'
            ),
        environment: z.array(z.string()).optional().describe('Environment names to filter the selection by. Example: ["production"].'),
        statsPeriod: z
            .string()
            .optional()
            .describe('Time window for the selection query, a number followed by d, h, m, s, or w. Overrides start and end. Example: "24h".'),
        start: z.string().optional().describe('ISO-8601 start of the selection time window. Example: "2026-01-01T00:00:00".'),
        end: z.string().optional().describe('ISO-8601 end of the selection time window. Example: "2026-01-02T00:00:00".'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of issues affected when selecting via filters. Provider maximum is 100.'),
        inbox: z.boolean().optional().describe('If true, marks the issues as reviewed by the requestor.'),
        status: z.enum(['resolved', 'unresolved', 'ignored', 'resolvedInNextRelease', 'muted']).optional().describe('New status for the selected issues.'),
        statusDetails: StatusDetailsInputSchema.optional(),
        substatus: z
            .enum(['archived_until_escalating', 'archived_until_condition_met', 'archived_forever', 'escalating', 'ongoing', 'regressed', 'new'])
            .nullable()
            .optional()
            .describe('New substatus for the selected issues; null clears it.'),
        hasSeen: z.boolean().optional().describe('If true, marks the issues as seen by the requestor.'),
        isBookmarked: z.boolean().optional().describe('If true, bookmarks the issues for the requestor; false removes the bookmark.'),
        isPublic: z.boolean().optional().describe('If true, publishes the issues with a public share link; false unpublishes them.'),
        isSubscribed: z.boolean().optional().describe('If true, subscribes the requestor to the issues.'),
        merge: z.boolean().optional().describe('If true, merges the selected issues together. This cannot be undone.'),
        discard: z
            .boolean()
            .optional()
            .describe('If true, discards the selected issues instead of updating them. Discarded issues are deleted and matching future events are dropped.'),
        assignedTo: z
            .string()
            .optional()
            .describe(
                'User or team to assign the issues to, as "<user_id>", "user:<user_id>", "<username>", "<user_primary_email>", or "team:<team_id>". Pass an empty string to unassign.'
            ),
        priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority to set on the selected issues.'),
        ignoreDuration: z.number().int().min(0).optional().describe('Ignore the issues for this many minutes.'),
        ignoreCount: z.number().int().min(0).optional().describe('Ignore the issues until each is seen this many more times.'),
        ignoreWindow: z.number().int().min(0).max(10080).optional().describe('Window in minutes over which ignoreCount is measured. Maximum 10080 (7 days).'),
        ignoreUserCount: z.number().int().min(0).optional().describe('Ignore the issues until each affects this many more users.'),
        ignoreUserWindow: z
            .number()
            .int()
            .min(0)
            .max(10080)
            .optional()
            .describe('Window in minutes over which ignoreUserCount is measured. Maximum 10080 (7 days).'),
        snoozeDuration: z.number().int().min(0).nullable().optional().describe('Snooze the issues for this many minutes; null clears an existing snooze.')
    })
    .describe(
        'Selects the issues to update and the fields to apply. Provide ids to target specific issues, or omit ids and pass status together with query, project, environment, or time filters to update all matching issues.'
    );

const StatusDetailsOutputSchema = z
    .object({
        inNextRelease: z.boolean().optional().describe('Whether the issues were marked as resolved in the next release.'),
        inRelease: z.string().optional().describe('Release version the issues were marked as resolved in.'),
        inCommit: z
            .object({
                commit: z.string().describe('SHA of the resolving commit.'),
                repository: z.string().describe('Name of the repository as it appears in Sentry.')
            })
            .optional()
            .describe('Commit the issues were marked as resolved in.'),
        ignoreDuration: z.number().optional().describe('Number of minutes the issues are ignored for.'),
        ignoreCount: z.number().optional().describe('Occurrence count threshold applied to the ignore.'),
        ignoreWindow: z.number().optional().describe('Window in minutes over which ignoreCount is measured.'),
        ignoreUserCount: z.number().optional().describe('Affected-user threshold applied to the ignore.'),
        ignoreUserWindow: z.number().optional().describe('Window in minutes over which ignoreUserCount is measured.')
    })
    .describe('Resolution details that were applied.');

const OutputSchema = z
    .object({
        status: z.string().optional().describe('The status applied to the issues.'),
        statusDetails: StatusDetailsOutputSchema.optional(),
        substatus: z.string().nullable().optional().describe('The substatus applied to the issues.'),
        inbox: z.boolean().optional().describe('Whether the issues were marked as reviewed.'),
        hasSeen: z.boolean().optional().describe('Whether the issues were marked as seen.'),
        isBookmarked: z.boolean().optional().describe('Whether the issues are now bookmarked.'),
        isPublic: z.boolean().optional().describe('Whether the issues are now public.'),
        isSubscribed: z.boolean().optional().describe('Whether the requestor is now subscribed to the issues.'),
        assignedTo: z
            .object({
                type: z.enum(['user', 'team']).describe('Whether the assignee is a user or a team.'),
                id: z.string().describe('ID of the assigned user or team.'),
                name: z.string().describe('Display name of the assigned user or team.'),
                email: z.string().optional().describe('Email of the assigned user.')
            })
            .nullable()
            .optional()
            .describe('User or team the issues were assigned to.'),
        merge: z
            .object({
                parent: z.string().describe('ID of the issue the others were merged into.'),
                children: z.array(z.string()).describe('IDs of the issues merged into the parent.')
            })
            .optional()
            .describe('Merge result, present when issues were merged.'),
        discard: z.boolean().optional().describe('Whether the issues were discarded.'),
        priority: z.string().optional().describe('The priority applied to the issues.'),
        shareId: z.string().optional().describe('Public share ID of the issues when they were published.'),
        subscriptionDetails: z
            .object({
                disabled: z.boolean().optional().describe('Whether the subscription is disabled.'),
                reason: z.string().optional().describe('Reason the subscription is disabled.')
            })
            .optional()
            .describe('Details of the resulting subscription state.')
    })
    .describe(
        'The fields Sentry actually changed, echoed back by the API. Empty when no issues matched the selection, in which case the API responds with 204 No Content.'
    );

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates issue attributes on the provider, and the optional discard and merge operations irreversibly delete or combine issues.
 * @pitfalls: Silently succeeds when nothing is updated: an empty object is returned when no issues match, and out-of-scope issue ids are skipped without error. Filter-based selection without ids only works for status updates, applies the provider default query "is:unresolved" when query is omitted, and affects at most 100 issues despite the 1000-issue id limit. Release-based statusDetails updates require all selected issues to be in a single project.
 */
const action = createAction({
    description: 'Update the given field(s) on up to 1000 issues at once, selected by id or by the current search query.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['event:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((!input.ids || input.ids.length === 0) && input.status === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Issue ids are required unless a status update is applied via query, project, or other filters.'
            });
        }

        const searchParams: string[] = [];
        for (const id of input.ids ?? []) {
            searchParams.push(`id=${id}`);
        }
        if (input.query !== undefined) {
            searchParams.push(`query=${encodeURIComponent(input.query)}`);
        }
        for (const project of input.project ?? []) {
            searchParams.push(`project=${encodeURIComponent(project)}`);
        }
        for (const environment of input.environment ?? []) {
            searchParams.push(`environment=${encodeURIComponent(environment)}`);
        }
        if (input.statsPeriod !== undefined) {
            searchParams.push(`statsPeriod=${encodeURIComponent(input.statsPeriod)}`);
        }
        if (input.start !== undefined) {
            searchParams.push(`start=${encodeURIComponent(input.start)}`);
        }
        if (input.end !== undefined) {
            searchParams.push(`end=${encodeURIComponent(input.end)}`);
        }
        if (input.limit !== undefined) {
            searchParams.push(`limit=${input.limit}`);
        }

        // retries: 1 - the update sets absolute field values, so a single retry after a lost response is safe;
        // kept minimal because ignore/snooze windows are relative to when the provider processes the request.
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/events/bulk-mutate-an-organizations-issues/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/issues/`,
            ...(searchParams.length > 0 ? { params: searchParams.join('&') } : {}),
            data: {
                ...(input.inbox !== undefined && { inbox: input.inbox }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.statusDetails !== undefined && { statusDetails: input.statusDetails }),
                ...(input.substatus !== undefined && { substatus: input.substatus }),
                ...(input.hasSeen !== undefined && { hasSeen: input.hasSeen }),
                ...(input.isBookmarked !== undefined && { isBookmarked: input.isBookmarked }),
                ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
                ...(input.isSubscribed !== undefined && { isSubscribed: input.isSubscribed }),
                ...(input.merge !== undefined && { merge: input.merge }),
                ...(input.discard !== undefined && { discard: input.discard }),
                ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.ignoreDuration !== undefined && { ignoreDuration: input.ignoreDuration }),
                ...(input.ignoreCount !== undefined && { ignoreCount: input.ignoreCount }),
                ...(input.ignoreWindow !== undefined && { ignoreWindow: input.ignoreWindow }),
                ...(input.ignoreUserCount !== undefined && { ignoreUserCount: input.ignoreUserCount }),
                ...(input.ignoreUserWindow !== undefined && { ignoreUserWindow: input.ignoreUserWindow }),
                ...(input.snoozeDuration !== undefined && { snoozeDuration: input.snoozeDuration })
            },
            retries: 1
        };
        const response = await nango.put(config);

        if (response.status === 204 || response.data === undefined || response.data === null || response.data === '') {
            return {};
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
