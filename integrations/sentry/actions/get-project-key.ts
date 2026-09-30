import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the Sentry organization that owns the project. Example: "acme".'),
        project_id_or_slug: z.string().describe('The ID or slug of the Sentry project that owns the key. Example: "my-app".'),
        key_id: z
            .string()
            .describe(
                'The public key of the client key to retrieve, which is the same value returned as its `id`/`public` fields (not a numeric ID). Example: "a785682ddda719b7a8a4011110d75598".'
            )
    })
    .describe('Identifies the Sentry project client key to retrieve.');

const RateLimitSchema = z
    .object({
        window: z.number().describe('Length of the rate limit window in seconds. Example: 7200.'),
        count: z.number().describe('Maximum number of events accepted within the window. Example: 1000.')
    })
    .describe('Rate limit enforced on this key.');

const DsnSchema = z
    .object({
        secret: z.string().describe('DSN URL authenticated with the secret key.'),
        public: z.string().describe('Public DSN URL used by SDKs to send events.'),
        csp: z.string().describe('Ingestion endpoint for Content Security Policy reports.'),
        security: z.string().describe('Ingestion endpoint for security policy reports.'),
        minidump: z.string().describe('Ingestion endpoint for minidump crash reports.'),
        nel: z.string().describe('Ingestion endpoint for Network Error Logging reports.'),
        unreal: z.string().describe('Ingestion endpoint for Unreal Engine crash reports.'),
        crons: z.string().describe('Check-in endpoint for cron monitors.'),
        cdn: z.string().describe('CDN URL of the JavaScript SDK loader script for this key.'),
        playstation: z.string().describe('Ingestion endpoint for PlayStation crash reports.'),
        integration: z.string().describe('Ingestion endpoint for partner integrations.'),
        otlp_traces: z.string().describe('OTLP ingestion endpoint for traces.'),
        otlp_logs: z.string().describe('OTLP ingestion endpoint for logs.')
    })
    .describe('Ingestion endpoint URLs derived from this key.');

const BrowserSdkSchema = z
    .object({
        choices: z.array(z.array(z.string())).describe('Selectable browser SDK versions as [value, label] pairs. Example: [["10.x", "10.x"]].')
    })
    .describe('Browser SDK versions offered by the JS loader.');

const DynamicSdkLoaderOptionsSchema = z
    .object({
        hasReplay: z.boolean().describe('Whether Session Replay is bundled in the JS loader.'),
        hasPerformance: z.boolean().describe('Whether performance tracing is bundled in the JS loader.'),
        hasDebug: z.boolean().describe('Whether debug mode is bundled in the JS loader.'),
        hasFeedback: z.boolean().describe('Whether user feedback collection is bundled in the JS loader.'),
        hasLogsAndMetrics: z.boolean().describe('Whether logs and metrics collection is bundled in the JS loader.')
    })
    .describe('Feature toggles baked into the JS SDK loader for this key.');

const ProjectKeySchema = z
    .object({
        id: z.string().describe('The client key\'s public key, which also serves as its API identifier. Example: "a785682ddda719b7a8a4011110d75598".'),
        name: z.string().describe('Display name of the client key. Example: "Default".'),
        label: z.string().describe('Legacy alias of `name`, kept for compatibility.'),
        public: z.string().nullable().describe('The public key component of the DSN, or null if unset.'),
        secret: z.string().nullable().describe('The secret key component of the DSN, or null if unset.'),
        projectId: z.number().describe('Numeric ID of the project this key belongs to. Example: 4505281256090153.'),
        isActive: z.boolean().describe('Whether the key is active and accepting events.'),
        rateLimit: RateLimitSchema.nullable().describe('Rate limit applied to this key, or null when no rate limit is configured.'),
        dsn: DsnSchema,
        browserSdkVersion: z.string().describe('Browser SDK version selected for the JS loader. Example: "10.x".'),
        browserSdk: BrowserSdkSchema,
        dateCreated: z.string().nullable().describe('ISO 8601 timestamp of when the key was created, or null if unset.'),
        dynamicSdkLoaderOptions: DynamicSdkLoaderOptionsSchema,
        useCase: z.string().optional().describe('Internal use-case classification of the key, only present for Sentry superusers.')
    })
    .describe('A Sentry project client key (DSN).');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of a project client key and modifies no provider state.
 * @pitfalls: `key_id` is the key's public DSN string (the same value the API returns as its `id`), not a numeric identifier; passing anything else returns 404.
 */
const action = createAction({
    description: 'Retrieve a single project key (DSN).',
    version: '1.0.0',
    input: InputSchema,
    output: ProjectKeySchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof ProjectKeySchema>> => {
        // https://docs.sentry.io/api/projects/retrieve-a-client-key/
        const response = await nango.get({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/keys/${encodeURIComponent(input.key_id)}/`,
            retries: 3
        });

        return ProjectKeySchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
