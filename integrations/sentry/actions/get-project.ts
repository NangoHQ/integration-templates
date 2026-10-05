import { z } from 'zod';
import { createAction } from 'nango';

const TeamSchema = z
    .object({
        id: z.string().describe('Numeric ID of the team, as a string. Example: "4512170111401984"'),
        name: z.string().describe('Display name of the team. Example: "Nango Seed Team"'),
        slug: z.string().describe('URL-friendly identifier of the team, unique within the organization. Example: "nango-seed-team"')
    })
    .describe('A team assigned to the project');

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization the project belongs to. Example: "nangodev"'),
        project_id_or_slug: z
            .string()
            .describe('ID or slug of the project to retrieve. Project slugs are unique within each organization. Example: "nango-seed-project"')
    })
    .describe('Input for retrieving a single Sentry project');

const OutputSchema = z
    .object({
        id: z.string().describe('Numeric ID of the project, as a string. Example: "4512170111991808"'),
        slug: z.string().describe('URL-friendly identifier of the project, unique within the organization. Example: "nango-seed-project"'),
        name: z.string().describe('Display name of the project. Example: "Nango Seed Project"'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the project was created. Example: "2026-09-29T12:00:00.000000Z"'),
        platform: z
            .string()
            .nullable()
            .optional()
            .describe('SDK platform key configured for the project (e.g. "node", "python"); null when no platform was selected'),
        status: z.string().describe('Lifecycle status of the project, e.g. "active", "pending_deletion" or "deletion_in_progress"').optional(),
        color: z.string().describe('Hex color code assigned to the project. Example: "#3f70bf"').optional(),
        isBookmarked: z.boolean().describe('Whether the acting user has bookmarked the project').optional(),
        isMember: z.boolean().describe('Whether the acting user is a member of the project').optional(),
        isPublic: z.boolean().describe('Whether the project is visible to all organization members').optional(),
        isInternal: z.boolean().describe('Whether the project is Sentry-internal').optional(),
        hasAccess: z.boolean().describe('Whether the acting user has access to the project').optional(),
        firstEvent: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of the first event the project received; null when no event has been received yet'),
        firstTransactionEvent: z.boolean().describe('Whether the project has received a transaction event').optional(),
        features: z.array(z.string()).describe('Feature flags enabled for the project. Example: ["custom-inbound-filters", "rate-limits"]').optional(),
        platforms: z.array(z.string()).describe('Platform keys observed or configured on the project. Example: ["node"]').optional(),
        avatar: z
            .object({
                avatarType: z.string().describe('Avatar kind, e.g. "letter_avatar" or "upload"').optional(),
                avatarUuid: z.string().nullable().optional().describe('UUID of the uploaded avatar image; null when using a generated avatar')
            })
            .describe('Avatar settings of the project')
            .optional(),
        team: TeamSchema.nullable().optional().describe('Primary team of the project; null when no team is assigned'),
        teams: z.array(TeamSchema).describe('All teams assigned to the project').optional(),
        latestRelease: z
            .object({
                version: z.string().describe('Version string of the release. Example: "nango-seed-1.0.0"').optional()
            })
            .nullable()
            .optional()
            .describe('Most recent release seen by the project; null when the project has no releases'),
        allowedDomains: z.array(z.string()).describe('Domains allowed to send events via the browser SDK. Example: ["sentry.io"]').optional(),
        subjectPrefix: z.string().describe('Prefix prepended to email alert subjects for this project').optional(),
        resolveAge: z.number().nullable().optional().describe('Hours after which an unresolved issue is auto-resolved; null or 0 when disabled'),
        dataScrubber: z.boolean().describe('Whether server-side data scrubbing is enabled for the project').optional(),
        dataScrubberDefaults: z.boolean().describe('Whether default data scrubbing rules are applied').optional(),
        safeFields: z.array(z.string()).describe('Fields exempted from data scrubbing').optional(),
        sensitiveFields: z.array(z.string()).describe('Additional fields treated as sensitive and scrubbed').optional(),
        storeCrashReports: z.number().nullable().optional().describe('Crash report storage limit per issue; null when using the organization default'),
        verifySSL: z.boolean().describe('Whether SSL certificates are verified when Sentry fetches remote sources (e.g. source maps)').optional(),
        scrubIPAddresses: z.boolean().describe('Whether IP addresses are scrubbed from incoming events').optional(),
        scrapeJavaScript: z.boolean().describe('Whether Sentry may scrape JavaScript sources for source context').optional(),
        groupingConfig: z.string().describe('Grouping algorithm configuration ID used for new issues. Example: "newstyle:2023-01-11"').optional(),
        fingerprintingRules: z.string().describe('Custom fingerprinting rules applied to incoming events').optional(),
        defaultEnvironment: z.string().nullable().optional().describe('Default environment applied to events without one; null when unset')
    })
    .describe('Details of a single Sentry project');

/**
 * @tags: [read]
 * @tagReason: Performs a single provider GET to read project details and causes no provider-side changes.
 */
const action = createAction({
    description: 'Retrieve details of a single Sentry project',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['project:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/projects/retrieve-a-project/
        const response = await nango.get({
            endpoint: `/0/projects/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.project_id_or_slug)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found',
                organization_id_or_slug: input.organization_id_or_slug,
                project_id_or_slug: input.project_id_or_slug
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
