import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProjectKeyRateLimitSchema = z
    .object({
        window: z.number().describe('Length of the rate-limit window in seconds. Example: 7200'),
        count: z.number().describe('Maximum number of events accepted within the rate-limit window. Example: 1000')
    })
    .describe('Rate limit applied to this client key');

const ProjectKeyDsnSchema = z
    .object({
        secret: z.string().optional().describe('Full DSN containing both the public and secret key parts'),
        public: z.string().optional().describe('Public DSN used by client SDKs to send events'),
        csp: z.string().optional().describe('Endpoint URL for Content Security Policy (CSP) reports'),
        security: z.string().optional().describe('Endpoint URL for security reports'),
        minidump: z.string().optional().describe('Endpoint URL for minidump crash reports'),
        nel: z.string().optional().describe('Endpoint URL for Network Error Logging (NEL) reports'),
        unreal: z.string().optional().describe('Endpoint URL for Unreal Engine crash reports'),
        crons: z.string().optional().describe('Endpoint URL template for cron monitor check-ins'),
        cdn: z.string().optional().describe('CDN URL of the browser SDK bundle preconfigured with this key'),
        playstation: z.string().optional().describe('Endpoint URL for PlayStation crash reports'),
        integration: z.string().optional().describe('Generic integration ingestion endpoint URL for the project'),
        otlp_traces: z.string().optional().describe('OTLP endpoint URL for ingesting traces'),
        otlp_logs: z.string().optional().describe('OTLP endpoint URL for ingesting logs')
    })
    .describe('DSN ingestion endpoint URLs derived from this client key');

const ProjectKeySchema = z
    .object({
        id: z.string().describe('Unique identifier of the client key. Example: "60120449b6b1d5e45f75561e6dabd80b"'),
        projectId: z.number().describe('Numeric ID of the Sentry project this key belongs to. Example: 4505281256090153'),
        name: z.string().describe('Name of the client key. Example: "Default"'),
        label: z.string().describe('Display label of the client key'),
        public: z.string().nullable().optional().describe('Public part of the client key pair; null when not set'),
        secret: z.string().nullable().optional().describe('Secret part of the client key pair; null when not set'),
        isActive: z.boolean().describe('Whether the client key is active and accepting events'),
        rateLimit: ProjectKeyRateLimitSchema.nullable().optional().describe('Rate limit applied to this key; null when the key is not rate limited'),
        dsn: ProjectKeyDsnSchema.describe('DSN ingestion endpoint URLs for this client key'),
        browserSdkVersion: z.string().describe('Default browser SDK version served by the CDN loader for this key. Example: "7.x"'),
        dateCreated: z.string().nullable().optional().describe('ISO 8601 timestamp of when the client key was created. Example: "2023-06-21T19:50:26.036254Z"'),
        useCase: z.string().optional().describe('Sentry use case associated with the key, when set')
    })
    .describe('A Sentry project client key (DSN)');

const OrganizationResponseSchema = z.object({
    slug: z.string()
});

const sync = createSync({
    description: 'Sync all client keys (DSNs) across every project in the Sentry organization',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ProjectKey: ProjectKeySchema
    },

    exec: async (nango) => {
        // Sentry auth tokens are scoped to a single organization; resolve it first so a
        // failure here happens before the delete-tracking window is opened.
        // https://docs.sentry.io/api/organizations/list-your-organizations/
        const organizationsResponse = await nango.get({
            endpoint: '/0/organizations/',
            retries: 3
        });
        const organizations = z.array(OrganizationResponseSchema).parse(organizationsResponse.data);
        const organization = organizations[0];

        if (!organization) {
            throw new Error('project-keys: no Sentry organization found for this connection');
        }

        // The project-keys endpoint has no modified-since filter, so this is a full refresh:
        // track deletions across a complete crawl that always starts from the first page.
        await nango.trackDeletesStart('ProjectKey');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.sentry.io/api/organizations/list-an-organizations-client-keys/
            endpoint: `/0/organizations/${encodeURIComponent(organization.slug)}/project-keys/`,
            params: {
                limit: 100
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            // A parse failure throws here on purpose: inside a delete-tracked crawl a skipped
            // record would be falsely reported as deleted at trackDeletesEnd().
            const keys = z.array(ProjectKeySchema).parse(page);

            if (keys.length === 0) {
                continue;
            }

            await nango.batchSave(keys, 'ProjectKey');
        }

        await nango.trackDeletesEnd('ProjectKey');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
