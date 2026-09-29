import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the project belongs to. Example: "my-org"'),
        project_id_or_slug: z
            .string()
            .describe('The ID or slug of the project the key belongs to. Project slugs are unique within an organization. Example: "my-project"'),
        key_id: z
            .string()
            .describe('The ID of the client key to update, which is the same value as its public key. Example: "60120449b6b1d5e45f75561e6dabd80b"'),
        name: z.string().optional().describe('The new name for the client key. Example: "Liked Pegasus"'),
        isActive: z
            .boolean()
            .optional()
            .describe('Whether the client key is active. Set to false to deactivate the key and stop it from accepting events. Example: true'),
        rateLimit: z
            .object({
                window: z.number().describe('Length of the rate-limit window in seconds. Example: 7200'),
                count: z.number().describe('Maximum number of events accepted within the window. Example: 1000')
            })
            .nullable()
            .optional()
            .describe('Rate limit capping the number of events accepted during a time window. Set to null to remove the rate limit entirely.')
    })
    .describe(
        'Input for updating a Sentry project client key. At least one of name, isActive, or rateLimit should be provided; omitted fields are left unchanged.'
    );

const RateLimitSchema = z.object({
    window: z.number().describe('Length of the rate-limit window in seconds.'),
    count: z.number().describe('Maximum number of events accepted within the window.')
});

const DsnSchema = z.object({
    secret: z.string().optional().describe('Full DSN including the secret component, used by server-side SDKs.'),
    public: z.string().optional().describe('Public DSN used by client-side SDKs to send events.'),
    csp: z.string().optional().describe('Endpoint URL for Content Security Policy reports.'),
    security: z.string().optional().describe('Endpoint URL for browser security reports.'),
    minidump: z.string().optional().describe('Endpoint URL for minidump crash reports.'),
    nel: z.string().optional().describe('Endpoint URL for Network Error Logging reports.'),
    unreal: z.string().optional().describe('Endpoint URL for Unreal Engine crash reports.'),
    crons: z.string().optional().describe('Endpoint URL template for cron monitor check-ins.'),
    cdn: z.string().optional().describe('URL of the hosted JavaScript loader script for this key.'),
    playstation: z.string().optional().describe('Endpoint URL for PlayStation crash reports.'),
    integration: z.string().optional().describe('Endpoint URL for generic integration payloads.'),
    otlp_traces: z.string().optional().describe('OTLP endpoint URL for trace ingestion.'),
    otlp_logs: z.string().optional().describe('OTLP endpoint URL for log ingestion.')
});

const DynamicSdkLoaderOptionsSchema = z.object({
    hasReplay: z.boolean().optional().describe('Whether Session Replay is enabled in the JavaScript loader.'),
    hasPerformance: z.boolean().optional().describe('Whether Performance Monitoring is enabled in the JavaScript loader.'),
    hasDebug: z.boolean().optional().describe('Whether debug bundles and logging are enabled in the JavaScript loader.'),
    hasFeedback: z.boolean().optional().describe('Whether User Feedback is enabled in the JavaScript loader.'),
    hasLogsAndMetrics: z.boolean().optional().describe('Whether logs and metrics are enabled in the JavaScript loader.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the client key, identical to its public key value.'),
        name: z.string().describe('Display name of the client key.'),
        label: z.string().describe('Label of the client key, mirroring its name.'),
        public: z.string().describe('Public component of the key, embedded in every DSN.'),
        secret: z.string().describe('Secret component of the key, used for authenticated ingestion.'),
        projectId: z.number().describe('Numeric ID of the project the key belongs to.'),
        isActive: z.boolean().describe('Whether the client key is currently active.'),
        rateLimit: RateLimitSchema.nullable().optional().describe('The active rate limit on the key, or null when no rate limit is set.'),
        browserSdkVersion: z.string().optional().describe('Version of the Sentry JavaScript SDK served by the loader script. Example: "7.x"'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the key was created. Example: "2023-06-21T19:50:26.036254Z"'),
        dsn: DsnSchema.optional().describe('Set of ingestion endpoint URLs derived from this key.'),
        dynamicSdkLoaderOptions: DynamicSdkLoaderOptionsSchema.optional().describe('Feature flags served by the JavaScript loader script for this key.')
    })
    .describe('The updated Sentry project client key.');

/**
 * @tags: [write]
 * @tagReason: Mutates a Sentry project client key's name, active state, or rate limit via the provider API.
 * @pitfalls: Setting rateLimit to null removes the key's rate limit entirely, whereas omitting rateLimit keeps the existing limit; any omitted field is left unchanged.
 */
const action = createAction({
    description: "Update a project key's name, rate limit, or active state.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // PUT is an absolute-value update here, so a retry after a lost response simply re-applies the same state.
        // https://docs.sentry.io/api/projects/update-a-client-key/
        const response = await nango.put({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/keys/${encodeURIComponent(input.key_id)}/`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.isActive !== undefined && { isActive: input.isActive }),
                ...(input.rateLimit !== undefined && { rateLimit: input.rateLimit })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
