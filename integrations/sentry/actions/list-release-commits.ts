import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization the release belongs to. Example: "nangodev".'),
        version: z.string().describe('Version identifier of the release. Example: "nango-seed-1.0.0".'),
        cursor: z.string().min(1).optional().describe("Pagination cursor from a previous response's next_cursor. Omit for the first page.")
    })
    .describe('Input for listing the commits associated with a release.');

const CommitAuthorSchema = z.object({
    name: z.string().optional().describe('Name of the commit author.'),
    email: z.string().optional().describe('Email address of the commit author.')
});

const PullRequestSchema = z.object({
    id: z.string().describe('Sentry-internal ID of the linked pull request.'),
    title: z.string().optional().describe('Title of the pull request. Omitted when null.'),
    message: z.string().optional().describe('Body of the pull request. Omitted when null.'),
    dateCreated: z.string().describe('ISO 8601 timestamp when the pull request was recorded. Example: "2024-01-01T00:00:00Z".'),
    mergedAt: z.string().optional().describe('ISO 8601 timestamp when the pull request was merged. Omitted when null or not merged.'),
    status: z.string().optional().describe('Status of the pull request. One of: merged, open, closed, draft, unknown. Omitted when null.')
});

const RepositorySchema = z.object({
    id: z.string().describe('Sentry-internal ID of the repository.'),
    name: z.string().describe('Name of the repository.'),
    url: z.string().optional().describe('Web URL of the repository. Omitted when null.'),
    status: z.string().optional().describe('Connection status of the repository.'),
    integrationId: z.string().optional().describe('ID of the Sentry integration that provides this repository. Omitted when null.'),
    externalSlug: z.string().optional().describe('Slug of the repository in the external provider. Example: "getsentry/sentry". Omitted when null.'),
    externalId: z.string().optional().describe('ID of the repository in the external provider. Omitted when null.'),
    dateCreated: z.string().describe('ISO 8601 timestamp when the repository was added to Sentry. Example: "2024-01-01T00:00:00Z".')
});

const CommitReleaseSchema = z.object({
    version: z.string().describe('Full version identifier of the release. Example: "frontend@1.0.0".'),
    shortVersion: z.string().describe('Shortened version string of the release. Example: "1.0.0".'),
    ref: z.string().optional().describe('Commit reference (SHA or tag) the release points at. Omitted when null.'),
    url: z.string().optional().describe('External URL of the release. Omitted when null.'),
    dateReleased: z.string().optional().describe('ISO 8601 timestamp when the release went live. Omitted when null.'),
    dateCreated: z.string().describe('ISO 8601 timestamp when the release was created. Example: "2024-01-01T00:00:00Z".')
});

const ReleaseCommitSchema = z.object({
    id: z.string().describe('SHA of the commit. Example: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2".'),
    message: z.string().optional().describe('Message of the commit. Omitted when null.'),
    dateCreated: z.string().describe('ISO 8601 timestamp when the commit was recorded. Example: "2024-01-01T00:00:00Z".'),
    suspectCommitType: z.string().describe('How Sentry flagged this commit as a suspect commit; an empty string when not applicable.'),
    pullRequest: PullRequestSchema.optional().describe('Pull request associated with the commit. Omitted when null.'),
    repository: RepositorySchema.optional().describe('Repository the commit belongs to. Omitted when null.'),
    author: CommitAuthorSchema.optional().describe('Author of the commit. Omitted when null.'),
    releases: z.array(CommitReleaseSchema).describe('Releases this commit is associated with.')
});

const OutputSchema = z
    .object({
        commits: z.array(ReleaseCommitSchema).describe('Commits associated with the release.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page of commits. Absent when there are no further results.')
    })
    .describe('Commits associated with the release, plus the cursor for the next page.');

const ProviderCommitAuthorSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional()
});

const ProviderPullRequestSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    dateCreated: z.string(),
    mergedAt: z.string().nullable().optional(),
    status: z.string().nullable().optional()
});

const ProviderRepositorySchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().nullable().optional(),
    status: z.string().optional(),
    integrationId: z.string().nullable().optional(),
    externalSlug: z.string().nullable().optional(),
    externalId: z.string().nullable().optional(),
    dateCreated: z.string()
});

const ProviderCommitReleaseSchema = z.object({
    version: z.string(),
    shortVersion: z.string(),
    ref: z.string().nullable(),
    url: z.string().nullable(),
    dateReleased: z.string().nullable(),
    dateCreated: z.string()
});

const ProviderCommitSchema = z.object({
    id: z.string(),
    message: z.string().nullable(),
    dateCreated: z.string(),
    suspectCommitType: z.string(),
    pullRequest: ProviderPullRequestSchema.nullable(),
    repository: ProviderRepositorySchema.nullable().optional(),
    author: ProviderCommitAuthorSchema.nullable().optional(),
    releases: z.array(ProviderCommitReleaseSchema)
});

function parseNextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    for (const part of linkHeader.split(',')) {
        if (!part.includes('rel="next"')) {
            continue;
        }
        const results = /results="(true|false)"/.exec(part)?.[1];
        const cursor = /cursor="([^"]+)"/.exec(part)?.[1];
        if (results === 'true' && cursor !== undefined) {
            return cursor;
        }
    }
    return undefined;
}

function mapCommit(commit: z.infer<typeof ProviderCommitSchema>): z.infer<typeof ReleaseCommitSchema> {
    return {
        id: commit.id,
        ...(commit.message != null && { message: commit.message }),
        dateCreated: commit.dateCreated,
        suspectCommitType: commit.suspectCommitType,
        ...(commit.pullRequest != null && {
            pullRequest: {
                id: commit.pullRequest.id,
                ...(commit.pullRequest.title != null && { title: commit.pullRequest.title }),
                ...(commit.pullRequest.message != null && { message: commit.pullRequest.message }),
                dateCreated: commit.pullRequest.dateCreated,
                ...(commit.pullRequest.mergedAt != null && { mergedAt: commit.pullRequest.mergedAt }),
                ...(commit.pullRequest.status != null && { status: commit.pullRequest.status })
            }
        }),
        ...(commit.repository != null && {
            repository: {
                id: commit.repository.id,
                name: commit.repository.name,
                ...(commit.repository.url != null && { url: commit.repository.url }),
                ...(commit.repository.status != null && { status: commit.repository.status }),
                ...(commit.repository.integrationId != null && { integrationId: commit.repository.integrationId }),
                ...(commit.repository.externalSlug != null && { externalSlug: commit.repository.externalSlug }),
                ...(commit.repository.externalId != null && { externalId: commit.repository.externalId }),
                dateCreated: commit.repository.dateCreated
            }
        }),
        ...(commit.author != null && {
            author: {
                ...(commit.author.name != null && { name: commit.author.name }),
                ...(commit.author.email != null && { email: commit.author.email })
            }
        }),
        releases: commit.releases.map((release) => ({
            version: release.version,
            shortVersion: release.shortVersion,
            ...(release.ref != null && { ref: release.ref }),
            ...(release.url != null && { url: release.url }),
            ...(release.dateReleased != null && { dateReleased: release.dateReleased }),
            dateCreated: release.dateCreated
        }))
    };
}

/**
 * @tags: [read]
 * @tagReason: Only reads the commits of a release via a GET request; nothing is created, modified, or deleted.
 * @pitfalls: A release that exists can still return an empty commit list; commits are only attached when the release was created with refs or explicit commit data (e.g. via sentry-cli set-commits or a connected repository integration), so an empty result does not mean the release is missing.
 */
const action = createAction({
    description: 'List commits associated with a release.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:releases'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/releases/list-an-organization-releases-commits/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/releases/${encodeURIComponent(input.version)}/commits/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const commits = z.array(ProviderCommitSchema).parse(response.data);
        const nextCursor = parseNextCursor(response.headers['link']);

        return {
            commits: commits.map(mapCommit),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
