import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization that owns the project. Example: "nangodev"'),
        project_id_or_slug: z
            .string()
            .describe('ID or slug of the project to list releases for. Project slugs are unique within an organization. Example: "nango-seed-project"'),
        query: z.string().optional().describe('Case-insensitive substring filter matched against the release version. Example: "1.0"'),
        environment: z
            .string()
            .optional()
            .describe('Only return releases deployed to or seen in this environment. Accepts a single environment name. Example: "production"'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of releases to return per page, between 1 and 100. Defaults to 100.'),
        cursor: z.string().optional().describe('Opaque pagination cursor. Pass the nextCursor value from a previous response. Omit for the first page.')
    })
    .describe('Filters and pagination for listing the releases of a single Sentry project.');

const ReleaseVersionSchema = z.object({
    raw: z.string().describe('Raw, unparsed version string. Example: "frontend@1.0.0"'),
    major: z.number().optional().describe('Major component when the version parses as semver.'),
    minor: z.number().optional().describe('Minor component when the version parses as semver.'),
    patch: z.number().optional().describe('Patch component when the version parses as semver.'),
    pre: z.string().optional().describe('Pre-release component when the version parses as semver. Omitted when null. Example: "rc1"'),
    buildCode: z.string().optional().describe('Build code component when the version parses as semver. Omitted when null.'),
    components: z.number().optional().describe('Number of components in the parsed version.')
});

const ReleaseVersionInfoSchema = z.object({
    package: z.string().optional().describe('Package portion of the version string. Omitted when null. Example: "frontend"'),
    version: ReleaseVersionSchema.describe('Parsed components of the release version.'),
    description: z.string().describe('Human-readable description of the version. Example: "1.0.0"'),
    buildHash: z.string().optional().describe('Build hash of the version when available. Omitted when null.')
});

const ReleaseDeploySchema = z.object({
    id: z.string().describe('Numeric deploy ID as a string. Example: "163186883"'),
    environment: z.string().describe('Environment the deploy targets. Example: "production"'),
    dateStarted: z.string().optional().describe('ISO 8601 timestamp when the deploy started. Omitted when null.'),
    dateFinished: z.string().optional().describe('ISO 8601 timestamp when the deploy finished. Omitted when null.'),
    name: z.string().optional().describe('Human-readable name of the deploy. Omitted when null.'),
    url: z.string().optional().describe('External URL for the deploy. Omitted when null.')
});

const ReleaseProjectSchema = z.object({
    id: z.number().describe('Numeric project ID.'),
    slug: z.string().describe('Project slug. Example: "nango-seed-project"'),
    name: z.string().describe('Project name. Example: "Nango Seed Project"'),
    newGroups: z.number().describe('Number of new issues introduced by this release in this project.'),
    platform: z.string().optional().describe('Primary platform of the project. Omitted when null. Example: "node"'),
    platforms: z.array(z.string()).optional().describe('All platforms associated with the project.'),
    hasHealthData: z.boolean().describe('Whether the project has session health data for this release.')
});

const ReleaseSchema = z.object({
    id: z.number().describe('Numeric release ID assigned by Sentry.'),
    version: z.string().describe('Full version string of the release; release-scoped endpoints key off this value. Example: "nango-seed-1.0.0"'),
    shortVersion: z.string().describe('Shortened version string used for display. Example: "1.0.0"'),
    status: z.string().describe('Status of the release. Example: "open" or "archived"'),
    ref: z.string().optional().describe('Git reference (commit SHA or tag) the release is tied to. Omitted when null.'),
    url: z.string().optional().describe('External URL pointing to the release. Omitted when null.'),
    dateReleased: z.string().optional().describe('ISO 8601 timestamp when the release was marked as released. Omitted when null.'),
    dateCreated: z.string().describe('ISO 8601 timestamp when the release was created.'),
    newGroups: z.number().describe('Number of new issues (groups) created by this release.'),
    owner: z.string().optional().describe('Owner of the release. Omitted when null.'),
    commitCount: z.number().describe('Number of commits associated with the release.'),
    deployCount: z.number().describe('Number of deploys associated with the release.'),
    firstEvent: z.string().optional().describe('ISO 8601 timestamp of the first event seen in this release. Omitted when null.'),
    lastEvent: z.string().optional().describe('ISO 8601 timestamp of the most recent event seen in this release. Omitted when null.'),
    userAgent: z.string().optional().describe('User agent of the client that created the release. Omitted when null.'),
    versionInfo: ReleaseVersionInfoSchema.describe('Parsed version metadata for the release.'),
    data: z.record(z.string(), z.unknown()).optional().describe('Free-form metadata attached to the release.'),
    lastCommit: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Most recent commit associated with the release, as a serialized Sentry commit object. Omitted when null.'),
    lastDeploy: ReleaseDeploySchema.optional().describe('Most recent deploy of the release. Omitted when null.'),
    authors: z.array(z.record(z.string(), z.unknown())).describe('Commit authors associated with the release, as serialized Sentry user objects.'),
    projects: z.array(ReleaseProjectSchema).describe('Projects this release is associated with, including per-project release stats.'),
    currentProjectMeta: z.record(z.string(), z.unknown()).optional().describe('Per-project metadata for this release, such as session health context.')
});

const OutputSchema = z
    .object({
        releases: z.array(ReleaseSchema).describe('Releases associated with the project, most recent first.'),
        nextCursor: z.string().optional().describe('Opaque cursor to pass as the cursor input to fetch the next page. Omitted when there are no more results.')
    })
    .describe('One page of releases associated with the project, plus the cursor to fetch the next page.');

const RawReleaseVersionSchema = z.object({
    raw: z.string(),
    major: z.number().nullable().optional(),
    minor: z.number().nullable().optional(),
    patch: z.number().nullable().optional(),
    pre: z.string().nullable().optional(),
    buildCode: z.string().nullable().optional(),
    components: z.number().nullable().optional()
});

const RawReleaseVersionInfoSchema = z.object({
    package: z.string().nullable().optional(),
    version: RawReleaseVersionSchema,
    description: z.string(),
    buildHash: z.string().nullable().optional()
});

const RawReleaseDeploySchema = z.object({
    id: z.string(),
    environment: z.string(),
    dateStarted: z.string().nullable().optional(),
    dateFinished: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    url: z.string().nullable().optional()
});

const RawReleaseProjectSchema = z.object({
    id: z.number(),
    slug: z.string(),
    name: z.string(),
    newGroups: z.number(),
    platform: z.string().nullable().optional(),
    platforms: z.array(z.string()).nullable().optional(),
    hasHealthData: z.boolean()
});

const RawReleaseSchema = z.object({
    id: z.number(),
    version: z.string(),
    shortVersion: z.string(),
    status: z.string(),
    ref: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    dateReleased: z.string().nullable().optional(),
    dateCreated: z.string(),
    newGroups: z.number(),
    owner: z.string().nullable().optional(),
    commitCount: z.number(),
    deployCount: z.number(),
    firstEvent: z.string().nullable().optional(),
    lastEvent: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
    versionInfo: RawReleaseVersionInfoSchema,
    data: z.record(z.string(), z.unknown()).optional(),
    lastCommit: z.record(z.string(), z.unknown()).nullable().optional(),
    lastDeploy: RawReleaseDeploySchema.nullable().optional(),
    authors: z.array(z.record(z.string(), z.unknown())),
    projects: z.array(RawReleaseProjectSchema),
    currentProjectMeta: z.record(z.string(), z.unknown()).optional()
});

function mapVersionInfo(versionInfo: z.infer<typeof RawReleaseVersionInfoSchema>): z.infer<typeof ReleaseVersionInfoSchema> {
    return {
        ...(versionInfo.package != null && { package: versionInfo.package }),
        version: {
            raw: versionInfo.version.raw,
            ...(versionInfo.version.major != null && { major: versionInfo.version.major }),
            ...(versionInfo.version.minor != null && { minor: versionInfo.version.minor }),
            ...(versionInfo.version.patch != null && { patch: versionInfo.version.patch }),
            ...(versionInfo.version.pre != null && { pre: versionInfo.version.pre }),
            ...(versionInfo.version.buildCode != null && { buildCode: versionInfo.version.buildCode }),
            ...(versionInfo.version.components != null && { components: versionInfo.version.components })
        },
        description: versionInfo.description,
        ...(versionInfo.buildHash != null && { buildHash: versionInfo.buildHash })
    };
}

function mapDeploy(deploy: z.infer<typeof RawReleaseDeploySchema>): z.infer<typeof ReleaseDeploySchema> {
    return {
        id: deploy.id,
        environment: deploy.environment,
        ...(deploy.dateStarted != null && { dateStarted: deploy.dateStarted }),
        ...(deploy.dateFinished != null && { dateFinished: deploy.dateFinished }),
        ...(deploy.name != null && { name: deploy.name }),
        ...(deploy.url != null && { url: deploy.url })
    };
}

function mapProject(project: z.infer<typeof RawReleaseProjectSchema>): z.infer<typeof ReleaseProjectSchema> {
    return {
        id: project.id,
        slug: project.slug,
        name: project.name,
        newGroups: project.newGroups,
        ...(project.platform != null && { platform: project.platform }),
        ...(project.platforms != null && { platforms: project.platforms }),
        hasHealthData: project.hasHealthData
    };
}

function mapRelease(release: z.infer<typeof RawReleaseSchema>): z.infer<typeof ReleaseSchema> {
    return {
        id: release.id,
        version: release.version,
        shortVersion: release.shortVersion,
        status: release.status,
        ...(release.ref != null && { ref: release.ref }),
        ...(release.url != null && { url: release.url }),
        ...(release.dateReleased != null && { dateReleased: release.dateReleased }),
        dateCreated: release.dateCreated,
        newGroups: release.newGroups,
        ...(release.owner != null && { owner: release.owner }),
        commitCount: release.commitCount,
        deployCount: release.deployCount,
        ...(release.firstEvent != null && { firstEvent: release.firstEvent }),
        ...(release.lastEvent != null && { lastEvent: release.lastEvent }),
        ...(release.userAgent != null && { userAgent: release.userAgent }),
        versionInfo: mapVersionInfo(release.versionInfo),
        ...(release.data !== undefined && { data: release.data }),
        ...(release.lastCommit != null && { lastCommit: release.lastCommit }),
        ...(release.lastDeploy != null && { lastDeploy: mapDeploy(release.lastDeploy) }),
        authors: release.authors,
        projects: release.projects.map(mapProject),
        ...(release.currentProjectMeta !== undefined && { currentProjectMeta: release.currentProjectMeta })
    };
}

function parseNextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string' || linkHeader.length === 0) {
        return undefined;
    }
    for (const link of linkHeader.split(',')) {
        if (!/rel="next"/.test(link)) {
            continue;
        }
        if (!/results="true"/.test(link)) {
            return undefined;
        }
        const cursorAttribute = /cursor="([^"]+)"/.exec(link);
        if (cursorAttribute && cursorAttribute[1]) {
            return cursorAttribute[1];
        }
        const urlMatch = /<([^>]+)>/.exec(link);
        if (urlMatch && urlMatch[1]) {
            const cursorParam = new URL(urlMatch[1]).searchParams.get('cursor');
            return cursorParam ?? undefined;
        }
        return undefined;
    }
    return undefined;
}

/**
 * Lists releases for a single Sentry project, one page at a time.
 * @tags: [read]
 * @tagReason: Only performs a read-only GET against the Sentry API and never modifies provider state.
 * @pitfalls: Keep the same query, environment, and per_page values when following nextCursor; cursors are bound to their original query context, so reusing one with different parameters can silently return an empty page, while a malformed cursor is rejected with a 400. Release-scoped follow-up endpoints key off the version string, not the numeric id.
 */
const action = createAction({
    description: 'List releases associated with a single project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:ci', 'project:admin', 'project:read', 'project:releases', 'project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/releases/list-a-projects-releases/
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/releases/`,
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.environment !== undefined && { environment: input.environment }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const releases = z.array(RawReleaseSchema).parse(response.data);
        const nextCursor = parseNextCursor(response.headers['link']);

        return {
            releases: releases.map(mapRelease),
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
