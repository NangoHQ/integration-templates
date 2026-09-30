import { createSync } from 'nango';
import { z } from 'zod';

const ReleaseProjectSchema = z
    .object({
        id: z.string().describe('Unique numeric identifier Sentry assigns to the project, as a string. Example: "4512170111991808".'),
        slug: z.string().describe('URL-friendly project slug, unique within the organization. Example: "nango-seed-project".'),
        name: z.string().describe('Human-readable name of the project.'),
        platform: z.string().optional().describe('Primary SDK platform of the project, e.g. "node". Omitted when Sentry reports no platform.')
    })
    .describe('A Sentry project associated with the release.');

const ReleaseDeploySchema = z
    .object({
        id: z.string().describe('Unique identifier Sentry assigns to the deploy, as a string.'),
        environment: z.string().describe('Name of the environment the release was deployed to, e.g. "production".'),
        dateStarted: z.string().optional().describe('ISO 8601 timestamp when the deploy started. Omitted when Sentry reports none.'),
        dateFinished: z.string().optional().describe('ISO 8601 timestamp when the deploy finished. Omitted when Sentry reports none.'),
        name: z.string().optional().describe('Human-readable name given to the deploy. Omitted when Sentry reports none.'),
        url: z.string().optional().describe('URL with more details about the deploy. Omitted when Sentry reports none.')
    })
    .describe('The most recent deploy recorded for the release.');

const ReleaseSchema = z
    .object({
        id: z.string().describe('Unique numeric identifier Sentry assigns to the release, as a string. Example: "1999746505".'),
        version: z.string().describe('Full release version string, e.g. "nango-seed-1.0.0". This is the value used in Sentry release API paths.'),
        shortVersion: z.string().describe('Shortened version string displayed in the Sentry UI.'),
        status: z.string().describe('Status of the release, e.g. "open" or "archived".'),
        ref: z.string().optional().describe('VCS reference (commit SHA, branch, or tag) associated with the release. Omitted when Sentry reports none.'),
        url: z.string().optional().describe('External URL associated with the release. Omitted when Sentry reports none.'),
        dateCreated: z.string().optional().describe('ISO 8601 timestamp when the release was created in Sentry.'),
        dateReleased: z.string().optional().describe('ISO 8601 timestamp when the release was marked as released. Omitted when Sentry reports none.'),
        firstEvent: z
            .string()
            .optional()
            .describe('ISO 8601 timestamp of the first event Sentry associated with this release. Omitted when Sentry reports none.'),
        lastEvent: z
            .string()
            .optional()
            .describe('ISO 8601 timestamp of the most recent event Sentry associated with this release. Omitted when Sentry reports none.'),
        newGroups: z.number().describe('Number of new issue groups first seen in this release.'),
        commitCount: z.number().describe('Number of commits associated with this release.'),
        deployCount: z.number().describe('Number of deploys recorded for this release.'),
        userAgent: z.string().optional().describe('User agent of the client that created the release. Omitted when Sentry reports none.'),
        projects: z.array(ReleaseProjectSchema).describe('Projects this release is associated with. Empty when the release is not bound to any project.'),
        lastDeploy: ReleaseDeploySchema.optional().describe('Most recent deploy of this release. Omitted when the release has never been deployed.')
    })
    .describe('A Sentry release: a version of code that Sentry associates error events, commits, and deploys with.');

const SentryOrganizationSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string().optional()
});

const SentryReleaseProjectSchema = z.object({
    id: z.number(),
    slug: z.string(),
    name: z.string(),
    platform: z.string().nullable().optional()
});

const SentryReleaseDeploySchema = z.object({
    id: z.string(),
    environment: z.string(),
    dateStarted: z.string().nullable().optional(),
    dateFinished: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    url: z.string().nullable().optional()
});

const SentryReleaseSchema = z.object({
    id: z.number(),
    version: z.string(),
    status: z.string(),
    shortVersion: z.string(),
    ref: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    dateCreated: z.string().nullable().optional(),
    dateReleased: z.string().nullable().optional(),
    firstEvent: z.string().nullable().optional(),
    lastEvent: z.string().nullable().optional(),
    newGroups: z.number(),
    commitCount: z.number(),
    deployCount: z.number(),
    userAgent: z.string().nullable().optional(),
    projects: z.array(SentryReleaseProjectSchema).optional(),
    lastDeploy: SentryReleaseDeploySchema.nullable().optional()
});

type SentryRelease = z.infer<typeof SentryReleaseSchema>;
type Release = z.infer<typeof ReleaseSchema>;

function parseNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }

    // Sentry always emits a rel="next" link, even on the last page; the
    // results="false" attribute on that link is what marks the end of the
    // result set, so the link must not be followed blindly.
    for (const link of linkHeader.split(',')) {
        if (!link.includes('rel="next"')) {
            continue;
        }
        if (!link.includes('results="true"')) {
            return undefined;
        }
        const cursorMatch = /[?&]cursor=([^&>]+)/.exec(link);
        return cursorMatch?.[1];
    }

    return undefined;
}

function toRelease(release: SentryRelease): Release {
    return {
        id: String(release.id),
        version: release.version,
        shortVersion: release.shortVersion,
        status: release.status,
        newGroups: release.newGroups,
        commitCount: release.commitCount,
        deployCount: release.deployCount,
        projects: (release.projects ?? []).map((project) => ({
            id: String(project.id),
            slug: project.slug,
            name: project.name,
            ...(project.platform != null && { platform: project.platform })
        })),
        ...(release.ref != null && { ref: release.ref }),
        ...(release.url != null && { url: release.url }),
        ...(release.dateCreated != null && { dateCreated: release.dateCreated }),
        ...(release.dateReleased != null && { dateReleased: release.dateReleased }),
        ...(release.firstEvent != null && { firstEvent: release.firstEvent }),
        ...(release.lastEvent != null && { lastEvent: release.lastEvent }),
        ...(release.userAgent != null && { userAgent: release.userAgent }),
        ...(release.lastDeploy != null && {
            lastDeploy: {
                id: release.lastDeploy.id,
                environment: release.lastDeploy.environment,
                ...(release.lastDeploy.dateStarted != null && { dateStarted: release.lastDeploy.dateStarted }),
                ...(release.lastDeploy.dateFinished != null && { dateFinished: release.lastDeploy.dateFinished }),
                ...(release.lastDeploy.name != null && { name: release.lastDeploy.name }),
                ...(release.lastDeploy.url != null && { url: release.lastDeploy.url })
            }
        })
    };
}

const sync = createSync({
    description: 'Sync releases for the organization.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['org:read', 'project:releases'],
    models: {
        Release: ReleaseSchema
    },

    exec: async (nango) => {
        // A Sentry API token is scoped to a single organization; resolve it once per run.
        // https://docs.sentry.io/api/organizations/
        const organizationsResponse = await nango.get({
            endpoint: '/0/organizations/',
            retries: 3
        });

        const organizationsParsed = z.array(SentryOrganizationSchema).safeParse(organizationsResponse.data);
        if (!organizationsParsed.success) {
            throw new Error(`Unexpected response while listing Sentry organizations: ${organizationsParsed.error.message}`);
        }

        const [organization] = organizationsParsed.data;
        if (!organization) {
            throw new Error('No Sentry organization is accessible with this connection.');
        }

        // Full refresh: the releases endpoint has no modified-since filter, so every
        // run crawls the complete list and relies on deletion detection. Start delete
        // tracking only after the organization lookup above has succeeded.
        await nango.trackDeletesStart('Release');

        // Full-refresh runs always start from page 1; never resume a cursor here.
        let cursor: string | undefined;

        do {
            // https://docs.sentry.io/api/releases/list-an-organizations-releases/
            const response = await nango.get({
                endpoint: `/0/organizations/${encodeURIComponent(organization.slug)}/releases/`,
                params: {
                    per_page: 100,
                    ...(cursor !== undefined && { cursor })
                },
                retries: 3
            });

            const releasesParsed = z.array(SentryReleaseSchema).safeParse(response.data);
            if (!releasesParsed.success) {
                // Abort instead of skipping: records missed inside a delete-tracked
                // scan would be falsely reported as deleted when trackDeletesEnd runs.
                throw new Error(`Unexpected response while listing Sentry releases: ${releasesParsed.error.message}`);
            }

            if (releasesParsed.data.length > 0) {
                await nango.batchSave(releasesParsed.data.map(toRelease), 'Release');
            }

            const linkHeader = response.headers['link'];
            const nextCursor = parseNextCursor(typeof linkHeader === 'string' ? linkHeader : undefined);
            // A repeated cursor while results="true" would otherwise loop forever. Fail loudly
            // instead of silently treating it as exhaustion: doing so inside a delete-tracked
            // scan would falsely mark unfetched releases as deleted at trackDeletesEnd().
            if (nextCursor !== undefined && nextCursor === cursor) {
                throw new Error(`Sentry returned a repeated release cursor while more results were reported: ${nextCursor}`);
            }
            cursor = nextCursor;
        } while (cursor !== undefined);

        await nango.trackDeletesEnd('Release');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
