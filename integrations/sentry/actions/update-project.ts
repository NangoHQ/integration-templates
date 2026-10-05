import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization the project belongs to. Example: "nangodev"'),
        project_id_or_slug: z
            .string()
            .describe('ID or slug of the project to update. Project slugs are unique within an organization. Example: "nango-seed-project"'),
        name: z.string().optional().describe('The name for the project. Example: "Pump Station"'),
        slug: z
            .string()
            .optional()
            .describe('New slug for the project. Must be unique within the organization; subsequent API calls must use the new slug. Example: "pump-station"'),
        platform: z.string().optional().describe('The platform for the project. Example: "node"'),
        isBookmarked: z.boolean().optional().describe('Star (bookmark) the project within the projects tab. Updatable with the project:read permission.'),
        digestsMinDelay: z.number().int().optional().describe('Minimum time in seconds to wait before sending an issue digest email. Example: 300'),
        digestsMaxDelay: z.number().int().optional().describe('Maximum time in seconds to wait before sending an issue digest email. Example: 1800'),
        resolveAge: z
            .number()
            .int()
            .optional()
            .describe('Automatically resolve an issue if it has not been seen for this many hours. Set to 0 to disable auto-resolve.'),
        subjectPrefix: z.string().optional().describe('Custom prefix for emails from this project. Example: "[MyApp]"'),
        subjectTemplate: z
            .string()
            .optional()
            .describe(
                'Email subject to use (excluding the prefix) for individual alerts. Usable variables: $title, $shortID, $projectID, $orgID, ${tag:key}. Example: "$shortID - $title"'
            ),
        defaultEnvironment: z.string().optional().describe('Environment selected by default when viewing this project. Example: "production"'),
        allowedDomains: z
            .array(z.string())
            .optional()
            .describe('Origins permitted to send events to this project. Use "*" to allow any. Example: ["example.com", "*.example.com"]'),
        dataScrubber: z.boolean().optional().describe('Remove known sensitive values from events before storing them.'),
        dataScrubberDefaults: z.boolean().optional().describe('Also scrub the built-in list of sensitive field names from Sentry.'),
        sensitiveFields: z
            .array(z.string())
            .optional()
            .describe('Additional field names to scrub from events, beyond the defaults. Example: ["password", "token"]'),
        safeFields: z.array(z.string()).optional().describe('Field names to exempt from scrubbing, including the built-in defaults.'),
        storeCrashReports: z
            .number()
            .int()
            .optional()
            .describe('Number of native crash report files to store per issue. Use -1 for unlimited or 0 to store none.'),
        securityToken: z.string().optional().describe('Token sent with security reports (CSP, Expect-CT, HPKP) so Sentry can verify their origin.'),
        securityTokenHeader: z.string().optional().describe('Name of the header carrying the security token on inbound security reports.'),
        verifySSL: z.boolean().optional().describe('Verify SSL certificates when delivering outbound webhooks and service hooks.'),
        scrubIPAddresses: z.boolean().optional().describe('Discard client IP addresses rather than storing them on events.'),
        scrapeJavaScript: z.boolean().optional().describe('Allow Sentry to fetch source files and source maps from your servers.'),
        enableAutoReleaseCreation: z
            .boolean()
            .optional()
            .describe('Automatically create releases from ingested events. When disabled, releases must be created manually (e.g. via the Sentry CLI).'),
        groupingConfig: z.string().optional().describe('Identifier of the grouping algorithm used to assign events to issues. Example: "newstyle:2026-01-20"'),
        groupingEnhancements: z
            .string()
            .optional()
            .describe('Grouping enhancement rules, as a newline-delimited config string, adjusting which stack frames contribute to an issue.'),
        secondaryGroupingConfig: z.string().optional().describe('Grouping algorithm run alongside the primary one during a grouping migration.'),
        secondaryGroupingExpiry: z
            .number()
            .int()
            .optional()
            .describe('Unix timestamp after which the secondary grouping algorithm stops running. Example: 1893456000'),
        fingerprintingRules: z
            .string()
            .optional()
            .describe('Fingerprinting rules, as a newline-delimited config string, controlling how events are grouped into issues.'),
        relayPiiConfig: z.string().optional().describe('Advanced data scrubbing rules, as a JSON string, applied before events are stored.'),
        builtinSymbolSources: z
            .array(z.string())
            .optional()
            .describe('Identifiers of Sentry-hosted symbol sources to use when symbolicating events. Example: ["ios", "android"]'),
        symbolSources: z.string().optional().describe('Custom symbol sources, as a JSON string, to use when symbolicating events.'),
        highlightTags: z.array(z.string()).optional().describe('Tag keys to highlight on the issues of this project. Example: ["release", "environment"]'),
        highlightContext: z
            .record(z.string(), z.array(z.string()))
            .optional()
            .describe('Mapping of context types to lists of keys to highlight on the issues of this project. Example: {"user": ["id", "email"]}'),
        autofixAutomationTuning: z
            .enum(['off', 'super_low', 'low', 'medium', 'high', 'always'])
            .optional()
            .describe('How aggressively Seer runs Autofix on new issues. Updatable with the project:read permission.'),
        seerScannerAutomation: z.boolean().optional().describe('Let Seer scan new issues automatically. Updatable with the project:read permission.'),
        debugFilesRole: z
            .enum(['member', 'admin', 'manager', 'owner'])
            .nullable()
            .optional()
            .describe('Role required to download debug information files, ProGuard mappings and source maps. Set to null to inherit the organization setting.')
    })
    .describe('Project settings to update. All settings fields are optional and only submitted fields are changed.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the project. Example: "4512170111991808"'),
        slug: z.string().describe('Slug of the project, unique within the organization. Example: "nango-seed-project"'),
        name: z.string().describe('Display name of the project. Example: "Nango Seed Project"'),
        platform: z.string().nullable().describe('Platform of the project, or null when no platform is set. Example: "node"'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the project was created. Example: "2026-09-29T14:26:57.696902Z"'),
        status: z.string().describe('Status of the project. Example: "active"'),
        isBookmarked: z.boolean().describe('Whether the project is starred within the projects tab.'),
        isMember: z.boolean().describe('Whether the acting user is a member of a team assigned to the project.'),
        hasAccess: z.boolean().describe('Whether the acting user has access to the project.'),
        digestsMinDelay: z.number().describe('Minimum time in seconds to wait before sending an issue digest email.'),
        digestsMaxDelay: z.number().describe('Maximum time in seconds to wait before sending an issue digest email.'),
        resolveAge: z.number().describe('Hours after which an unseen issue is automatically resolved. 0 means auto-resolve is disabled.'),
        subjectPrefix: z.string().describe('Custom prefix for emails from this project.'),
        subjectTemplate: z.string().describe('Email subject template (excluding the prefix) for individual alerts.'),
        defaultEnvironment: z.string().nullable().describe('Environment selected by default when viewing this project, or null when none is set.'),
        allowedDomains: z.array(z.string()).describe('Origins permitted to send events to this project.'),
        dataScrubber: z.boolean().describe('Whether known sensitive values are removed from events before storing them.'),
        dataScrubberDefaults: z.boolean().describe('Whether the built-in list of sensitive field names is also scrubbed.'),
        sensitiveFields: z.array(z.string()).describe('Additional field names scrubbed from events, beyond the defaults.'),
        safeFields: z.array(z.string()).describe('Field names exempt from scrubbing, including the built-in defaults.'),
        storeCrashReports: z
            .number()
            .nullable()
            .describe('Number of native crash report files stored per issue, or null when not configured. -1 means unlimited and 0 means none.'),
        securityToken: z.string().describe('Token sent with security reports (CSP, Expect-CT, HPKP) so Sentry can verify their origin.'),
        securityTokenHeader: z
            .string()
            .nullable()
            .describe('Name of the header carrying the security token on inbound security reports, or null when not set.'),
        verifySSL: z.boolean().describe('Whether SSL certificates are verified when delivering outbound webhooks and service hooks.'),
        scrubIPAddresses: z.boolean().describe('Whether client IP addresses are discarded rather than stored on events.'),
        scrapeJavaScript: z.boolean().describe('Whether Sentry may fetch source files and source maps from your servers.'),
        enableAutoReleaseCreation: z.boolean().describe('Whether releases are automatically created from ingested events.'),
        groupingConfig: z.string().describe('Identifier of the grouping algorithm used to assign events to issues.'),
        groupingEnhancements: z.string().describe('Grouping enhancement rules adjusting which stack frames contribute to an issue.'),
        secondaryGroupingConfig: z
            .string()
            .nullable()
            .describe('Grouping algorithm run alongside the primary one during a grouping migration, or null when none is configured.'),
        secondaryGroupingExpiry: z.number().describe('Unix timestamp after which the secondary grouping algorithm stops running.'),
        fingerprintingRules: z.string().describe('Fingerprinting rules controlling how events are grouped into issues.'),
        relayPiiConfig: z.string().nullable().describe('Advanced data scrubbing rules as a JSON string, or null when not configured.'),
        builtinSymbolSources: z.array(z.string()).describe('Identifiers of Sentry-hosted symbol sources used when symbolicating events.'),
        symbolSources: z.string().describe('Custom symbol sources as a JSON string used when symbolicating events.'),
        highlightTags: z.array(z.string()).describe('Tag keys highlighted on the issues of this project.'),
        highlightContext: z
            .record(z.string(), z.array(z.string()))
            .describe('Mapping of context types to lists of keys highlighted on the issues of this project.'),
        autofixAutomationTuning: z.string().describe('How aggressively Seer runs Autofix on new issues. Example: "medium"'),
        seerScannerAutomation: z.boolean().describe('Whether Seer scans new issues automatically.'),
        debugFilesRole: z.string().nullable().describe('Role required to download debug information files, or null when inheriting the organization setting.')
    })
    .describe('The updated project with its current settings.');

/**
 * @tags: [write]
 * @tagReason: Sends a PUT that mutates project settings on the provider; it performs no reads and deletes nothing.
 * @pitfalls: With only the project:read scope, just isBookmarked and the Seer automation toggles can be updated; any other field returns 403. Changing slug re-keys the project, so subsequent requests must use the new slug. Submitting no settings fields is a successful no-op that returns the project unchanged.
 */
const action = createAction({
    description: "Update a project's settings (name, slug, platform, bookmarked flag, digest delays, and more). Only submitted fields are changed.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { organization_id_or_slug, project_id_or_slug, ...settings } = input;

        const data = Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined));

        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/projects/update-a-project/
            endpoint: `/0/projects/${encodeURIComponent(organization_id_or_slug)}/${encodeURIComponent(project_id_or_slug)}/`,
            data,
            // PUT re-applies identical field values, so retrying this update is idempotent.
            retries: 3
        };
        const response = await nango.put(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
