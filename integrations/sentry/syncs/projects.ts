import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.string(),
    slug: z.string()
});

const TeamSchema = z.object({
    id: z.string().describe('Numeric ID of the team, returned as a string (e.g. "4512170111401984").'),
    name: z.string().describe('Display name of the team.'),
    slug: z.string().describe('URL-safe slug of the team, unique within the organization.')
});

const LatestReleaseSchema = z.object({
    version: z.string().describe('Version string of the release (e.g. "nango-seed-1.0.0"). This version is the key used by Sentry release endpoints.')
});

const ProjectSchema = z
    .object({
        id: z.string().describe('Numeric ID of the project, returned as a string (e.g. "4512170111991808").'),
        slug: z.string().describe('URL-safe slug of the project, unique within the organization.'),
        name: z.string().describe('Display name of the project.'),
        platform: z.string().nullable().describe('Primary platform key of the project (e.g. "node", "python"), or null when no platform is set.'),
        platforms: z.array(z.string()).describe('Platform keys for which the project has received events.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the project was created (e.g. "2026-09-29T14:27:47.062201Z").'),
        isBookmarked: z.boolean().describe('Whether the acting user has bookmarked the project.'),
        isMember: z.boolean().describe('Whether the acting user is a member of a team assigned to the project.'),
        hasAccess: z.boolean().describe('Whether the acting user has access to the project.'),
        access: z
            .array(z.string())
            .describe(
                "Org-role permission scopes surfaced for the acting user (e.g. 'project:read'). Reflects the user's organization role in the Sentry UI, not the API token's actual grants."
            ),
        features: z.array(z.string()).describe('Feature flags enabled on the project.'),
        environments: z.array(z.string()).describe('Names of environments that have sent events or deploys to the project (e.g. ["production"]).'),
        firstEvent: z.string().nullable().describe('ISO 8601 timestamp of the first event received by the project, or null if no event has been received yet.'),
        firstTransactionEvent: z.boolean().describe('Whether the project has received at least one transaction event.'),
        team: TeamSchema.nullable().describe('Primary team that owns the project, or null when no team is assigned.'),
        teams: z.array(TeamSchema).describe('All teams assigned to the project.'),
        latestRelease: LatestReleaseSchema.nullable().describe('Latest release associated with the project, or null when the project has no releases.'),
        hasSessions: z.boolean().describe('Whether the project has received session (release health) data.'),
        hasProfiles: z.boolean().describe('Whether the project has received profiling data.'),
        hasReplays: z.boolean().describe('Whether the project has received session replay data.'),
        hasFeedbacks: z.boolean().describe('Whether the project has received user feedback.'),
        hasNewFeedbacks: z.boolean().describe('Whether the project has received feedback via the newer feedback envelope format.'),
        hasMonitors: z.boolean().describe('Whether the project has cron monitors configured.'),
        hasMinifiedStackTrace: z.boolean().describe('Whether the project has events with minified stack traces.'),
        hasUserReports: z.boolean().describe('Whether the project has received legacy user reports.'),
        hasFlags: z.boolean().describe('Whether the project has received feature flag evaluation data.'),
        hasLogs: z.boolean().describe('Whether the project has received log data.'),
        hasTraceMetrics: z.boolean().describe('Whether the project has trace metric data.'),
        hasInsightsHttp: z.boolean().describe('Whether the project has HTTP insights data.'),
        hasInsightsDb: z.boolean().describe('Whether the project has database insights data.'),
        hasInsightsAssets: z.boolean().describe('Whether the project has asset insights data.'),
        hasInsightsAppStart: z.boolean().describe('Whether the project has app-start insights data.'),
        hasInsightsScreenLoad: z.boolean().describe('Whether the project has screen-load insights data.'),
        hasInsightsVitals: z.boolean().describe('Whether the project has web-vitals insights data.'),
        hasInsightsCaches: z.boolean().describe('Whether the project has cache insights data.'),
        hasInsightsQueues: z.boolean().describe('Whether the project has queue insights data.'),
        hasInsightsAgentMonitoring: z.boolean().describe('Whether the project has AI agent monitoring data.'),
        hasInsightsMCP: z.boolean().describe('Whether the project has MCP (Model Context Protocol) monitoring data.')
    })
    .describe('A Sentry project within the organization, including its owning teams, environments, and capability flags.');

const MetadataSchema = z
    .object({
        organization_id_or_slug: z
            .string()
            .optional()
            .describe(
                'ID or slug of the Sentry organization to sync projects from (e.g. "nangodev"). When omitted, the organization is resolved automatically: Sentry API tokens only return their own organization from the list-organizations endpoint.'
            )
    })
    .describe('Connection metadata for the Sentry projects sync.');

const sync = createSync({
    description:
        'Sync all projects in a Sentry organization, including their teams and environments. Full refresh; projects deleted in Sentry are removed from the cache.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['org:read'],
    metadata: MetadataSchema,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});

        let organizationIdOrSlug = metadata.organization_id_or_slug;
        if (!organizationIdOrSlug) {
            // https://docs.sentry.io/api/users/list-your-organizations/
            const organizationsResponse = await nango.get({
                endpoint: '/0/organizations/',
                retries: 3
            });
            const organizations = z.array(OrganizationSchema).parse(organizationsResponse.data);
            const organization = organizations[0];
            if (!organization) {
                throw new Error('No Sentry organization found for this connection. Set organization_id_or_slug in the connection metadata.');
            }
            organizationIdOrSlug = organization.slug;
        }

        await nango.trackDeletesStart('Project');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.sentry.io/api/organizations/list-an-organizations-projects/
            endpoint: `/0/organizations/${encodeURIComponent(organizationIdOrSlug)}/projects/`,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            if (page.length === 0) {
                // Sentry always returns a rel="next" link, even on the last page (marked
                // results="false"), and every empty page mints a fresh cursor, so the link
                // paginator would never terminate on its own. Stop on the first empty page.
                break;
            }

            // Throw on parse failure: skipped records would be falsely marked as deleted
            // when the delete-tracking window closes.
            const projects = z.array(ProjectSchema).parse(page);
            await nango.batchSave(projects, 'Project');
        }

        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
