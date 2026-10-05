import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization to list releases for. Example: "my-org"'),
        query: z.string().optional().describe('Case-insensitive substring match against the release version. Example: "1.0.0"'),
        per_page: z.number().int().min(1).max(100).optional().describe('Maximum number of releases to return. Default and maximum allowed is 100.'),
        cursor: z
            .string()
            .regex(/^\d+:-?\d+:\d+$/)
            .optional()
            .describe('Pagination cursor from a previous response nextCursor value, in "<int>:<int>:<int>" format. Omit for the first page.')
    })
    .describe('Input for listing organization releases.');

const ReleaseProjectSchema = z
    .object({
        id: z.number().describe('Numeric ID of the project associated with the release.'),
        slug: z.string().describe('Slug of the project associated with the release.'),
        name: z.string().describe('Name of the project associated with the release.'),
        newGroups: z.number().optional().describe('Number of new issues (groups) introduced by this release in the project.'),
        platform: z.string().nullable().optional().describe('Primary platform of the project (e.g. "javascript"), or null when the project has none.'),
        platforms: z.array(z.string()).optional().describe('All platforms observed for the project in this release.'),
        hasHealthData: z.boolean().optional().describe('Whether the project has session health data for this release.')
    })
    .describe('A project associated with the release.');

const ReleaseVersionSchema = z
    .object({
        raw: z.string().optional().describe('Raw version string. Example: "1.0.0"'),
        major: z.number().optional().describe('Major version component.'),
        minor: z.number().optional().describe('Minor version component.'),
        patch: z.number().optional().describe('Patch version component.'),
        pre: z.string().nullable().optional().describe('Pre-release version component, or null when none.'),
        buildCode: z.string().nullable().optional().describe('Build code component, or null when none.'),
        components: z.number().optional().describe('Number of version components.')
    })
    .describe('Structured semantic version breakdown of the release version.');

const ReleaseVersionInfoSchema = z
    .object({
        package: z.string().nullable().optional().describe('Package part of the version string, or null when none. Example: "frontend"'),
        version: ReleaseVersionSchema.nullable().optional().describe('Parsed version components, or null when the version is not parseable.'),
        description: z.string().optional().describe('Human-readable version description. Example: "1.0.0"'),
        buildHash: z.string().nullable().optional().describe('Build hash of the release, or null when none.')
    })
    .describe('Parsed version metadata for the release.');

const ReleaseSchema = z
    .object({
        id: z.number().describe('Numeric ID of the release.'),
        version: z.string().describe('Full version string of the release. Example: "frontend@1.0.0"'),
        shortVersion: z.string().optional().describe('Shortened version string of the release.'),
        status: z.string().optional().describe('Status of the release, e.g. "open" or "archived".'),
        versionInfo: ReleaseVersionInfoSchema.nullable()
            .optional()
            .describe('Parsed version metadata for the release, or null/omitted when the version could not be parsed.'),
        ref: z.string().nullable().optional().describe('Git ref (branch or tag) the release points to, or null when unset.'),
        url: z.string().nullable().optional().describe('External URL for the release, or null when unset.'),
        dateReleased: z.string().nullable().optional().describe('ISO 8601 timestamp when the release was finalized, or null when not yet released.'),
        dateCreated: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp when the release was created, or null/omitted when unknown. Example: "2024-01-01T00:00:00Z"'),
        data: z.record(z.string(), z.unknown()).optional().describe('Provider-specific metadata attached to the release.'),
        newGroups: z.number().optional().describe('Number of new issues (groups) first seen in this release.'),
        owner: z.record(z.string(), z.unknown()).nullable().optional().describe('Owner of the release, or null when none is assigned.'),
        commitCount: z.number().optional().describe('Number of commits associated with the release.'),
        lastCommit: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional()
            .describe('Summary of the most recent commit associated with the release, or null when none.'),
        deployCount: z.number().optional().describe('Number of deploys recorded for the release.'),
        lastDeploy: z.record(z.string(), z.unknown()).nullable().optional().describe('Summary of the most recent deploy of the release, or null when none.'),
        authors: z.array(z.record(z.string(), z.unknown())).optional().describe('Authors of commits associated with the release.'),
        projects: z.array(ReleaseProjectSchema).optional().describe('Projects this release is associated with.'),
        firstEvent: z.string().nullable().optional().describe('ISO 8601 timestamp of the first event seen in this release, or null when none.'),
        lastEvent: z.string().nullable().optional().describe('ISO 8601 timestamp of the most recent event seen in this release, or null when none.'),
        currentProjectMeta: z.record(z.string(), z.unknown()).optional().describe('Project-specific metadata for the current request context.'),
        userAgent: z.string().nullable().optional().describe('User agent that created the release, or null.')
    })
    .describe('A Sentry release.');

const OutputSchema = z
    .object({
        releases: z.array(ReleaseSchema).describe('Releases for the organization, sorted by most recent.'),
        nextCursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page. Omitted when there are no more results.')
    })
    .describe('Page of organization releases plus the cursor for the next page.');

function parseNextCursor(headers: Record<string, unknown> | undefined): string | undefined {
    if (!headers) {
        return undefined;
    }
    const linkHeader: unknown = headers['link'] ?? headers['Link'];
    if (typeof linkHeader !== 'string') {
        return undefined;
    }
    for (const part of linkHeader.split(',')) {
        if (part.includes('rel="next"')) {
            const results = /results="([^"]*)"/.exec(part);
            const cursor = /cursor="([^"]*)"/.exec(part);
            if (results?.[1] === 'true' && cursor?.[1]) {
                return cursor[1];
            }
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Lists releases with a single GET request and never mutates provider state.
 * @pitfalls: Each release carries both a numeric id and a version string, but other release endpoints identify releases by the version string, not the numeric id. Releases are listed most-recent-first from a live collection, so releases created or deleted between page fetches can shift subsequent pages and a full pagination pass may return duplicates or miss entries.
 */
const action = createAction({
    description: 'List releases for the organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:ci', 'project:admin', 'project:read', 'project:releases', 'project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.sentry.io/api/releases/list-an-organizations-releases/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/releases/`,
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const releases = z.array(ReleaseSchema).parse(response.data);
        const nextCursor = parseNextCursor(response.headers);

        return {
            releases,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
