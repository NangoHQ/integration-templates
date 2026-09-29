import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const PatchSetEntrySchema = z
    .object({
        path: z.string().describe('Path of the file changed by the commit. Example: "src/index.ts"'),
        type: z.string().describe('Type of change applied to the file: "A" for added, "M" for modified, or "D" for deleted. Example: "M"')
    })
    .describe('A file changed by the commit');

const CommitSchema = z
    .object({
        id: z.string().describe('Commit identifier, usually the full commit SHA. Example: "3da541559918a808c2402bba5012f6c60b27661c"'),
        repository: z.string().optional().describe('Name of the repository the commit belongs to, as configured in Sentry. Example: "nangohq/nango"'),
        message: z.string().optional().describe('Commit message. Example: "Fix crash on empty input"'),
        author_name: z.string().optional().describe('Name of the commit author. Example: "Jane Doe"'),
        author_email: z.string().optional().describe('Email address of the commit author. Example: "jane@example.com"'),
        timestamp: z.string().optional().describe('Commit timestamp as an ISO 8601 date-time. Example: "2026-09-29T12:00:00Z"'),
        patch_set: z.array(PatchSetEntrySchema).optional().describe('List of files changed by the commit.')
    })
    .describe('A commit to associate with the release');

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the Sentry organization the release belongs to. Example: "nangodev"'),
        version: z.string().describe('Version identifier for the release. Can be a version number, a commit hash, and so on. Example: "1.0.0"'),
        projects: z
            .array(z.string().describe('Slug of a project involved in the release. Example: "my-project"'))
            .describe('Slugs of the projects that are involved in this release.'),
        ref: z.string().optional().describe('Optional commit reference. Useful if a tagged version has been provided. Example: "v1.0.0"'),
        url: z
            .string()
            .optional()
            .describe('URL that points to the release, such as a GitHub release page. Example: "https://github.com/nangohq/nango/releases/tag/v1.0.0"'),
        dateReleased: z
            .string()
            .optional()
            .describe('Date the release went live as an ISO 8601 date-time. Defaults to the current time when omitted. Example: "2026-09-29T12:00:00Z"'),
        commits: z.array(CommitSchema).optional().describe('Optional list of commit data to associate with the release.')
    })
    .describe('Input for creating a Sentry release');

const ReleaseProjectSchema = z
    .object({
        id: z.number().describe('Numeric ID of the project. Example: 4512170111991808'),
        slug: z.string().describe('Slug of the project. Example: "nango-seed-project"'),
        name: z.string().describe('Display name of the project. Example: "Nango Seed Project"'),
        platform: z.string().optional().describe('Primary platform of the project, when set. Example: "node"'),
        platforms: z.array(z.string().describe('Platform key. Example: "node"')).optional().describe('Platforms associated with the project, when set.'),
        hasHealthData: z.boolean().describe('Whether the project has health (session) data for this release.'),
        newGroups: z.number().describe('Number of new issue groups created in this project for the release. Example: 0')
    })
    .describe('A project bound to the release');

const OutputSchema = z
    .object({
        id: z.number().describe('Numeric ID of the release. Example: 1234567890'),
        version: z.string().describe('Version identifier of the release. Example: "1.0.0"'),
        shortVersion: z.string().describe('Shortened version identifier shown in the Sentry UI. Example: "1.0.0"'),
        status: z.string().describe('Status of the release, either "open" or "archived". Example: "open"'),
        ref: z.string().optional().describe('Commit reference of the release, when provided. Example: "v1.0.0"'),
        url: z.string().optional().describe('URL pointing to the release, when provided. Example: "https://github.com/nangohq/nango/releases/tag/v1.0.0"'),
        dateReleased: z.string().optional().describe('ISO 8601 date-time the release went live. Example: "2026-09-29T12:00:00Z"'),
        dateCreated: z.string().optional().describe('ISO 8601 date-time the release was created in Sentry. Example: "2026-09-29T12:00:00Z"'),
        newGroups: z.number().describe('Number of new issue groups associated with the release. Example: 0'),
        commitCount: z.number().describe('Number of commits associated with the release. Example: 1'),
        deployCount: z.number().describe('Number of deploys recorded for the release. Example: 0'),
        projects: z.array(ReleaseProjectSchema).describe('Projects the release is bound to.')
    })
    .describe('The created Sentry release');

const ProviderReleaseSchema = z.object({
    id: z.number(),
    version: z.string(),
    shortVersion: z.string(),
    status: z.string(),
    ref: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    dateReleased: z.string().nullable().optional(),
    dateCreated: z.string().nullable().optional(),
    newGroups: z.number(),
    commitCount: z.number(),
    deployCount: z.number(),
    projects: z.array(
        z.object({
            id: z.number(),
            slug: z.string(),
            name: z.string(),
            platform: z.string().nullable().optional(),
            platforms: z.array(z.string()).nullable().optional(),
            hasHealthData: z.boolean(),
            newGroups: z.number()
        })
    )
});

/**
 * @tags: [write]
 * @tagReason: Creates a new release in Sentry, which is a provider mutation, and performs no provider reads.
 * @pitfalls: Release versions are unique per organization and shared across projects, so re-posting an existing version returns the pre-existing release (with its original creation date) instead of creating a duplicate or failing.
 */
const action = createAction({
    description: 'Create a new release, optionally attaching commits',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:releases'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/releases/create-a-new-release-for-an-organization/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/releases/`,
            data: {
                version: input.version,
                projects: input.projects,
                ...(input.ref !== undefined && { ref: input.ref }),
                ...(input.url !== undefined && { url: input.url }),
                ...(input.dateReleased !== undefined && { dateReleased: input.dateReleased }),
                ...(input.commits !== undefined && { commits: input.commits })
            },
            // Sentry keys releases by (organization, version) and returns the existing release on a duplicate create, so a retry after a lost response cannot create a duplicate.
            retries: 3
        };

        const response = await nango.post(config);

        const release = ProviderReleaseSchema.parse(response.data);

        return {
            id: release.id,
            version: release.version,
            shortVersion: release.shortVersion,
            status: release.status,
            ...(release.ref != null && { ref: release.ref }),
            ...(release.url != null && { url: release.url }),
            ...(release.dateReleased != null && { dateReleased: release.dateReleased }),
            ...(release.dateCreated != null && { dateCreated: release.dateCreated }),
            newGroups: release.newGroups,
            commitCount: release.commitCount,
            deployCount: release.deployCount,
            projects: release.projects.map((project) => ({
                id: project.id,
                slug: project.slug,
                name: project.name,
                ...(project.platform != null && { platform: project.platform }),
                ...(project.platforms != null && { platforms: project.platforms }),
                hasHealthData: project.hasHealthData,
                newGroups: project.newGroups
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
