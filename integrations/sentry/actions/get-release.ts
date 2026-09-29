import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the release belongs to. Example: "nangodev"'),
        version: z.string().describe('The version identifier of the release to retrieve. Example: "nango-seed-1.0.0"')
    })
    .describe('Input for retrieving a single Sentry release.');

const ReleaseVersionInfoSchema = z
    .object({
        package: z.string().nullable().describe('The package name parsed from the version string, or null when the version is not a package-based version.'),
        version: z.record(z.string(), z.unknown()).describe('Structured representation of the parsed version string.'),
        description: z.string().optional().describe('Human-readable description of the parsed version.'),
        buildHash: z.string().nullable().describe('The build hash parsed from the version string, or null when the version does not contain one.')
    })
    .describe('Structured information parsed from the release version string.');

const ReleaseDeploySchema = z
    .object({
        id: z.string().describe('The ID of the deploy.'),
        environment: z.string().describe('The environment the release was deployed to. Example: "production"'),
        dateStarted: z.string().nullable().optional().describe('ISO 8601 timestamp of when the deploy started, or null when unknown.'),
        dateFinished: z.string().describe('ISO 8601 timestamp of when the deploy finished.'),
        name: z.string().nullable().describe('The name of the deploy, or null when it was not given a name.'),
        url: z.string().nullable().optional().describe('An external URL for the deploy, or null when not set.')
    })
    .describe('A deploy of the release.');

const ReleaseAuthorSchema = z
    .object({
        id: z.string().optional().describe('The Sentry user ID of the author. Absent when the author is not a Sentry user.'),
        name: z.string().describe('The name of the author.'),
        email: z.string().describe('The email address of the author.'),
        username: z.string().optional().describe('The Sentry username of the author. Absent when the author is not a Sentry user.'),
        avatarUrl: z.string().optional().describe('The avatar URL of the author. Absent when the author is not a Sentry user.')
    })
    .describe('An author of a commit associated with the release.');

const ReleaseProjectSchema = z
    .object({
        id: z.number().describe('The numeric ID of the project.'),
        slug: z.string().describe('The slug of the project.'),
        name: z.string().describe('The name of the project.'),
        newGroups: z.number().describe('The number of new issues first seen in this release within this project.'),
        platform: z.string().nullable().describe('The primary platform of the project, or null when not set. Example: "node"'),
        platforms: z.array(z.string()).nullable().describe('The platforms observed in this project, or null when none have been observed.'),
        hasHealthData: z.boolean().describe('Whether the project has session health data for this release.'),
        dateReleased: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of when the release was finalized in this project, or null when not finalized.'),
        dateCreated: z.string().nullable().optional().describe('ISO 8601 timestamp of when the release was created in this project, or null when unknown.'),
        dateStarted: z.string().nullable().optional().describe('ISO 8601 timestamp of when the release started in this project, or null when unknown.'),
        healthData: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional()
            .describe('Session health statistics for this release in this project. Only populated when health data is requested.')
    })
    .describe('A project associated with the release.');

const OutputSchema = z
    .object({
        id: z.number().describe('The numeric ID of the release.'),
        version: z.string().describe('The full version identifier of the release.'),
        status: z.string().describe('The status of the release. One of "open" or "archived".'),
        shortVersion: z.string().describe('A shortened form of the version string, used for display.'),
        versionInfo: ReleaseVersionInfoSchema.nullable().describe(
            'Structured information parsed from the version string, or null when it could not be parsed.'
        ),
        ref: z.string().nullable().optional().describe('The commit reference (branch, tag, or SHA range) associated with the release, or null when not set.'),
        url: z.string().nullable().optional().describe('An external URL for the release, or null when not set.'),
        dateReleased: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of when the release was finalized, or null when it has not been released yet.'),
        dateCreated: z.string().nullable().optional().describe('ISO 8601 timestamp of when the release was created.'),
        dateStarted: z.string().nullable().optional().describe('ISO 8601 timestamp of when the release started, or null when unknown.'),
        data: z.record(z.string(), z.unknown()).describe('Arbitrary metadata associated with the release.'),
        newGroups: z.number().describe('The number of new issues first seen in this release.'),
        owner: z.record(z.string(), z.unknown()).nullable().optional().describe('The owner of the release, or null when no owner is set.'),
        commitCount: z.number().describe('The number of commits associated with the release.'),
        lastCommit: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional()
            .describe('The most recent commit associated with the release, or null when no commits are associated.'),
        deployCount: z.number().describe('The number of deploys of the release.'),
        lastDeploy: ReleaseDeploySchema.nullable().optional().describe('The most recent deploy of the release, or null when it has never been deployed.'),
        authors: z.array(ReleaseAuthorSchema).describe('The authors of the commits associated with the release.'),
        projects: z.array(ReleaseProjectSchema).describe('The projects associated with the release.'),
        firstEvent: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of the first event seen in this release, or null when no events have been seen.'),
        lastEvent: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of the most recent event seen in this release, or null when no events have been seen.'),
        currentProjectMeta: z.record(z.string(), z.unknown()).nullable().optional().describe('Additional per-project metadata for the release.'),
        userAgent: z.string().nullable().optional().describe('The user agent of the client that created the release, or null when unknown.'),
        adoptionStages: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional()
            .describe('Adoption stage information per project. Only populated when adoption stages are requested.')
    })
    .describe('The details of a single Sentry release.');

/**
 * @tags: [read]
 * @tagReason: Performs a single provider read with no mutations.
 * @pitfalls: The version input must be the release's version string, not its numeric id; release objects carry both, and only the version string identifies the release.
 */
const action = createAction({
    description: "Retrieve a single release's details.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/releases/retrieve-an-organizations-release/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/releases/${encodeURIComponent(input.version)}/`,
            retries: 3
        };
        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Release not found',
                organization_id_or_slug: input.organization_id_or_slug,
                version: input.version
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
