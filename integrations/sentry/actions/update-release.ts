import { z } from 'zod';
import { createAction } from 'nango';

const CommitSchema = z.object({
    id: z.string().max(64).describe('SHA of the commit to associate with the release. Example: "3da54c24a197601440bd44f86939b7a5b46ba7b2"'),
    repository: z.string().max(64).nullable().optional().describe('Name of the repository the commit belongs to. Example: "my-org/my-repo"'),
    message: z.string().nullable().optional().describe('Commit message. Example: "fix: handle null pointer in parser"'),
    author_name: z.string().max(128).nullable().optional().describe('Name of the commit author. Example: "Jane Doe"'),
    author_email: z.string().max(200).nullable().optional().describe('Email of the commit author. Example: "jane@example.com"'),
    timestamp: z.string().nullable().optional().describe('ISO 8601 timestamp of the commit. Example: "2026-09-29T12:00:00Z"'),
    patch_set: z
        .array(
            z.object({
                path: z.string().max(510).describe('Path of the file changed by the commit. Example: "src/index.ts"'),
                type: z.string().max(1).describe('Single-character change type of the file: "A" (added), "M" (modified), or "D" (deleted). Example: "M"')
            })
        )
        .nullable()
        .optional()
        .describe('Optional list of files changed by the commit')
});

const RefSchema = z.object({
    repository: z.string().max(200).describe('Name of the repository the commit range belongs to. Example: "my-org/my-repo"'),
    commit: z.string().describe('SHA of the HEAD (end) commit for this repository in the release. Example: "3da54c24a197601440bd44f86939b7a5b46ba7b2"'),
    previousCommit: z
        .string()
        .max(64)
        .nullable()
        .optional()
        .describe(
            'SHA of the HEAD commit of the previous release. Should be supplied the first time commit data is sent. Example: "1b5a3f20a197601440bd44f86939b7a5b46ba7a1"'
        )
});

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the Sentry organization the release belongs to. Example: "nangodev"'),
        version: z.string().describe('Version identifier of the release to update. Example: "nango-seed-1.0.0"'),
        ref: z
            .string()
            .max(200)
            .nullable()
            .optional()
            .describe(
                'Commit reference for the release, useful when a tagged version was provided. Pass null to clear. Example: "6ba09b7c14535b4ef2b3e5c3c2f9c0b5e3d12345"'
            ),
        url: z
            .string()
            .nullable()
            .optional()
            .describe(
                'URL pointing to the release, such as a GitHub compare or tag page. Pass null to clear. Example: "https://github.com/my-org/my-repo/releases/tag/v1.0.0"'
            ),
        dateReleased: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 date indicating when the release went live. Pass null to clear. Example: "2026-09-29T12:00:00Z"'),
        commits: z.array(CommitSchema).optional().describe('List of commit data to associate with the release'),
        status: z.enum(['open', 'archived']).optional().describe('Status to set on the release. Example: "archived"'),
        refs: z.array(RefSchema).optional().describe('Start and end commits for each repository included in the release')
    })
    .describe('Input for updating a Sentry release. Only the supplied fields are changed; omitted fields are left untouched.');

const ProviderReleaseSchema = z.object({
    id: z.number(),
    version: z.string(),
    status: z.string(),
    shortVersion: z.string(),
    ref: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    dateReleased: z.string().nullable().optional(),
    dateStarted: z.string().nullable().optional(),
    dateCreated: z.string().nullable().optional(),
    newGroups: z.number(),
    commitCount: z.number(),
    deployCount: z.number(),
    firstEvent: z.string().nullable().optional(),
    lastEvent: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Numeric ID of the release assigned by Sentry. Example: 1122684517'),
        version: z.string().describe('Full version identifier of the release. Example: "nango-seed-1.0.0"'),
        status: z.string().describe('Status of the release: "open" or "archived". Example: "open"'),
        shortVersion: z.string().describe('Shortened version identifier shown in the Sentry UI. Example: "nango-seed-1.0.0"'),
        ref: z.string().optional().describe('Commit reference set on the release. Example: "6ba09b7c14535b4ef2b3e5c3c2f9c0b5e3d12345"'),
        url: z.string().optional().describe('URL pointing to the release. Example: "https://github.com/my-org/my-repo/releases/tag/v1.0.0"'),
        dateReleased: z.string().optional().describe('ISO 8601 date when the release went live. Example: "2026-09-29T12:00:00Z"'),
        dateStarted: z.string().optional().describe('ISO 8601 date when the release started being deployed. Example: "2026-09-29T11:00:00Z"'),
        dateCreated: z.string().optional().describe('ISO 8601 date when the release was created in Sentry. Example: "2026-09-29T10:00:00Z"'),
        newGroups: z.number().describe('Number of new issues first seen in this release. Example: 0'),
        commitCount: z.number().describe('Number of commits associated with the release. Example: 2'),
        deployCount: z.number().describe('Number of deploys recorded for the release. Example: 1'),
        firstEvent: z.string().optional().describe('ISO 8601 timestamp of the first event seen in this release. Example: "2026-09-29T12:30:00Z"'),
        lastEvent: z.string().optional().describe('ISO 8601 timestamp of the most recent event seen in this release. Example: "2026-09-29T13:00:00Z"')
    })
    .describe('The updated Sentry release.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing release's metadata (ref, url, dates, status, or commit associations) through the provider's update endpoint; performs no reads and deletes nothing.
 * @pitfalls: The release is identified by its exact version string, not the numeric id returned on release objects. Sending an explicit null for ref, url, or dateReleased clears that value, while omitting the field leaves it unchanged.
 */
const action = createAction({
    description: "Update a release's ref/url/dateReleased or commit list.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/releases/update-an-organizations-release/
        const response = await nango.put({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/releases/${encodeURIComponent(input.version)}/`,
            data: {
                ...(input.ref !== undefined && { ref: input.ref }),
                ...(input.url !== undefined && { url: input.url }),
                ...(input.dateReleased !== undefined && { dateReleased: input.dateReleased }),
                ...(input.commits !== undefined && { commits: input.commits }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.refs !== undefined && { refs: input.refs })
            },
            // retries: 3 is safe because this PUT sets absolute field values, so repeating it after a lost response leaves the release in the same state
            retries: 3
        });

        const release = ProviderReleaseSchema.parse(response.data);

        return {
            id: release.id,
            version: release.version,
            status: release.status,
            shortVersion: release.shortVersion,
            ...(release.ref != null && { ref: release.ref }),
            ...(release.url != null && { url: release.url }),
            ...(release.dateReleased != null && { dateReleased: release.dateReleased }),
            ...(release.dateStarted != null && { dateStarted: release.dateStarted }),
            ...(release.dateCreated != null && { dateCreated: release.dateCreated }),
            newGroups: release.newGroups,
            commitCount: release.commitCount,
            deployCount: release.deployCount,
            ...(release.firstEvent != null && { firstEvent: release.firstEvent }),
            ...(release.lastEvent != null && { lastEvent: release.lastEvent })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
