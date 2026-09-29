import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the project belongs to. Example: "nangodev".'),
        project_id_or_slug: z.string().describe('The ID or slug of the project whose client keys to list. Example: "nango-seed-project".'),
        status: z.enum(['active', 'inactive']).optional().describe('Filter client keys by status. Omit to return all keys regardless of status.'),
        cursor: z
            .string()
            .regex(/^\d+:-?\d+:\d+$/, 'cursor must be a Sentry pagination cursor such as "100:1:0"')
            .optional()
            .describe('Pagination cursor returned as nextCursor by a previous call. Omit for the first page.')
    })
    .describe("Parameters for listing a project's client keys (DSNs).");

const RateLimitSchema = z.object({
    window: z.number().describe('Length of the rate limit window in seconds. Example: 7200.'),
    count: z.number().describe('Maximum number of events the key accepts within the window. Example: 1000.')
});

const DsnSchema = z.object({
    secret: z.string().optional().describe('Secret-authenticated DSN used by server-side SDKs.'),
    public: z.string().optional().describe('Public DSN used by SDKs to send events. Example: "https://<key>@o0.ingest.sentry.io/0".'),
    csp: z.string().optional().describe('CSP report ingestion endpoint URL.'),
    security: z.string().optional().describe('Security report ingestion endpoint URL.'),
    minidump: z.string().optional().describe('Minidump upload endpoint URL.'),
    nel: z.string().optional().describe('Network Error Logging report ingestion endpoint URL.'),
    playstation: z.string().optional().describe('PlayStation crash report ingestion endpoint URL.'),
    integration: z.string().optional().describe('Generic integration ingestion endpoint URL.'),
    otlp_traces: z.string().optional().describe('OpenTelemetry traces ingestion endpoint URL.'),
    otlp_logs: z.string().optional().describe('OpenTelemetry logs ingestion endpoint URL.'),
    unreal: z.string().optional().describe('Unreal Engine crash report ingestion endpoint URL.'),
    cdn: z.string().optional().describe('Hosted browser SDK loader bundle URL for this key.'),
    crons: z.string().optional().describe('Cron monitor check-in endpoint URL template for this key.')
});

const BrowserSdkSchema = z.object({
    choices: z.array(z.array(z.string())).describe('Selectable browser SDK versions as [value, label] pairs.')
});

const DynamicSdkLoaderOptionsSchema = z.object({
    hasReplay: z.boolean().optional().describe('Whether the dynamic loader bundle includes Session Replay.'),
    hasPerformance: z.boolean().optional().describe('Whether the dynamic loader bundle includes Performance Monitoring (tracing).'),
    hasDebug: z.boolean().optional().describe('Whether the dynamic loader bundle includes debug logging.'),
    hasFeedback: z.boolean().optional().describe('Whether the dynamic loader bundle includes the User Feedback widget.'),
    hasLogsAndMetrics: z.boolean().optional().describe('Whether the dynamic loader bundle includes logs and metrics.')
});

const ProjectKeySchema = z.object({
    id: z.string().describe('Unique identifier of the client key.'),
    name: z.string().describe('Name of the client key. Example: "Default".'),
    label: z.string().optional().describe('Display label of the client key.'),
    public: z.string().describe('Public component of the key, embedded in the DSNs as the sentry_key.'),
    secret: z.string().optional().describe('Secret component of the key. Treat this value as a credential.'),
    projectId: z.number().optional().describe('Numeric ID of the project the key belongs to.'),
    isActive: z.boolean().optional().describe('Whether the key is active and able to ingest events.'),
    rateLimit: RateLimitSchema.optional().describe('Per-key event rate limit. Absent when no rate limit is configured.'),
    dsn: DsnSchema.describe('Endpoint-specific DSN URLs derived from this key.'),
    browserSdkVersion: z.string().optional().describe('Default browser SDK version recommended for this key. Example: "7.x".'),
    browserSdk: BrowserSdkSchema.optional().describe('Browser SDK version metadata for the JavaScript loader.'),
    dateCreated: z.string().optional().describe('ISO 8601 timestamp of when the key was created.'),
    dynamicSdkLoaderOptions: DynamicSdkLoaderOptionsSchema.optional().describe('Feature flags baked into the dynamic JavaScript loader for this key.')
});

const OutputSchema = z
    .object({
        keys: z.array(ProjectKeySchema).describe('Client keys bound to the project.'),
        nextCursor: z.string().optional().describe('Cursor to pass back as input cursor to fetch the next page. Absent when there are no more results.')
    })
    .describe("The project's client keys (DSNs) and pagination state.");

const ProviderProjectKeySchema = z.object({
    id: z.string(),
    name: z.string(),
    label: z.string().optional(),
    public: z.string(),
    secret: z.string().optional(),
    projectId: z.number().optional(),
    isActive: z.boolean().optional(),
    rateLimit: RateLimitSchema.nullable().optional(),
    dsn: DsnSchema,
    browserSdkVersion: z.string().optional(),
    browserSdk: BrowserSdkSchema.optional(),
    dateCreated: z.string().optional(),
    dynamicSdkLoaderOptions: DynamicSdkLoaderOptionsSchema.nullable().optional()
});

function extractNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    for (const part of linkHeader.split(',')) {
        const relMatch = part.match(/rel="(next|previous)"/);
        const resultsMatch = part.match(/results="(true|false)"/);
        const cursorMatch = part.match(/[?&]cursor=([^&>]+)/);
        if (relMatch && relMatch[1] === 'next' && resultsMatch && resultsMatch[1] === 'true' && cursorMatch && cursorMatch[1]) {
            return decodeURIComponent(cursorMatch[1]);
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only fetches the project's client keys with a GET request; it creates, updates, or deletes nothing.
 * @pitfalls: The output includes each key's secret value and secret DSN, so treat it as sensitive credential material. New projects start with an auto-created "Default" key, but keys can be deleted afterwards, so the returned list can be empty.
 */
const action = createAction({
    description: "List a project's client keys (DSNs).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/projects/list-a-projects-client-keys/
        const response = await nango.get<unknown>({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/keys/`,
            params: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerKeys = z.array(ProviderProjectKeySchema).parse(response.data);

        const linkHeader = response.headers?.['link'];
        const nextCursor = extractNextCursor(typeof linkHeader === 'string' ? linkHeader : undefined);

        const keys: z.infer<typeof ProjectKeySchema>[] = providerKeys.map((key) => ({
            id: key.id,
            name: key.name,
            ...(key.label !== undefined && { label: key.label }),
            public: key.public,
            ...(key.secret !== undefined && { secret: key.secret }),
            ...(key.projectId !== undefined && { projectId: key.projectId }),
            ...(key.isActive !== undefined && { isActive: key.isActive }),
            ...(key.rateLimit != null && { rateLimit: key.rateLimit }),
            dsn: key.dsn,
            ...(key.browserSdkVersion !== undefined && { browserSdkVersion: key.browserSdkVersion }),
            ...(key.browserSdk !== undefined && { browserSdk: key.browserSdk }),
            ...(key.dateCreated !== undefined && { dateCreated: key.dateCreated }),
            ...(key.dynamicSdkLoaderOptions != null && { dynamicSdkLoaderOptions: key.dynamicSdkLoaderOptions })
        }));

        return {
            keys,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
