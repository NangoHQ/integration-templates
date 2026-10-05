import { createSync } from 'nango';
import { z } from 'zod';

const MonitorConfigSchema = z
    .object({
        schedule_type: z
            .enum(['crontab', 'interval'])
            .describe("Schedule syntax used by the monitor: 'crontab' for a crontab expression or 'interval' for a fixed interval."),
        schedule: z
            .union([z.string(), z.tuple([z.number(), z.string()])])
            .describe(
                "Crontab expression (e.g. '0 * * * *') when schedule_type is 'crontab', or a [count, unit] tuple (e.g. [1, 'day']) when schedule_type is 'interval'."
            ),
        checkin_margin: z
            .number()
            .nullable()
            .optional()
            .describe('Minutes after the expected check-in time before the check-in is considered missed. Null when the monitor uses the Sentry default.'),
        max_runtime: z
            .number()
            .nullable()
            .optional()
            .describe('Minutes a check-in may stay in progress before it is considered failed. Null when the monitor uses the Sentry default.'),
        timezone: z
            .string()
            .nullable()
            .optional()
            .describe("IANA time zone the crontab schedule is evaluated in (e.g. 'America/Los_Angeles'). Null when unset."),
        failure_issue_threshold: z
            .number()
            .nullable()
            .optional()
            .describe('Number of consecutive failed check-ins before an issue is created. Null when disabled.'),
        recovery_threshold: z
            .number()
            .nullable()
            .optional()
            .describe('Number of consecutive successful check-ins before a monitor issue is resolved. Null when disabled.'),
        alert_rule_id: z.number().nullable().optional().describe('Legacy ID of the alert rule attached to this monitor. Null when no alert rule is attached.')
    })
    .describe('Schedule and check-in tolerance configuration of the monitor.');

const MonitorProjectSchema = z
    .object({
        id: z.string().describe('Numeric Sentry ID of the project the monitor belongs to.'),
        slug: z.string().describe('URL-safe slug of the project the monitor belongs to.'),
        name: z.string().describe('Display name of the project the monitor belongs to.'),
        platform: z.string().nullable().optional().describe("SDK platform key of the project (e.g. 'node'). Null when the project has no platform set.")
    })
    .describe('Project the monitor belongs to.');

const MonitorIncidentNoticeSchema = z
    .object({
        userNotifiedTimestamp: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp when users were notified about the broken monitor environment. Null while no notification has been sent.'),
        environmentMutedTimestamp: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp when the broken monitor environment was muted. Null while it is not muted.')
    })
    .describe('Notification state for a broken monitor environment.');

const MonitorIncidentSchema = z
    .object({
        startingTimestamp: z.string().nullable().optional().describe('ISO 8601 timestamp when the active incident started.'),
        resolvingTimestamp: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp when the active incident started resolving. Null while the incident is unresolved.'),
        brokenNotice: MonitorIncidentNoticeSchema.nullable()
            .optional()
            .describe('Notification state of the active incident. Null when no broken notice has been issued.')
    })
    .describe('Currently active incident of a monitor environment.');

const MonitorEnvironmentSchema = z
    .object({
        name: z.string().describe("Name of the environment (e.g. 'production')."),
        status: z.string().describe("Health status of the monitor in this environment (e.g. 'ok', 'error', 'missed_checkin')."),
        isMuted: z.boolean().describe('Whether the monitor environment is muted and does not create issues.'),
        dateCreated: z.string().describe('ISO 8601 timestamp when the monitor environment was created.'),
        lastCheckIn: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of the most recent check-in in this environment. Null when no check-in was ever received.'),
        nextCheckIn: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp when the next check-in is expected in this environment. Null when no check-in is scheduled.'),
        nextCheckInLatest: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 timestamp of the latest acceptable next check-in (nextCheckIn plus the check-in margin). Null when no check-in is scheduled.'),
        activeIncident: MonitorIncidentSchema.nullable()
            .optional()
            .describe('Currently active incident for this environment. Null when the environment is healthy.')
    })
    .describe('Per-environment state of the monitor.');

const MonitorOwnerSchema = z
    .object({
        id: z.string().describe('ID of the owning user or team.'),
        name: z.string().describe('Display name of the owning user or team.'),
        type: z.enum(['user', 'team']).describe("Whether the monitor is owned by a 'user' or a 'team'."),
        email: z.string().optional().describe('Email address of the owning user. Only present for user owners.')
    })
    .describe('User or team that owns the monitor.');

const MonitorSchema = z
    .object({
        id: z.string().describe('Unique Sentry ID of the cron monitor (UUID).'),
        slug: z.string().describe('URL-safe slug of the monitor, unique within the organization.'),
        name: z.string().describe('Display name of the monitor.'),
        status: z.string().describe("Lifecycle status of the monitor (e.g. 'active', 'disabled', 'pending_deletion')."),
        isMuted: z.boolean().describe('Whether the monitor is muted and does not create issues.'),
        isUpserting: z.boolean().describe('Whether the monitor was created implicitly by a check-in upsert.'),
        dateCreated: z.string().describe('ISO 8601 timestamp when the monitor was created.'),
        config: MonitorConfigSchema,
        project: MonitorProjectSchema,
        environments: z
            .array(MonitorEnvironmentSchema)
            .describe('Per-environment state of the monitor. Empty until the monitor receives a check-in for an environment.'),
        owner: MonitorOwnerSchema.nullable().optional().describe('User or team that owns the monitor. Null when the monitor is unassigned.')
    })
    .describe('A Sentry cron monitor, including its schedule configuration and nested per-environment state.');

const OrganizationSchema = z.object({
    id: z.string(),
    slug: z.string()
});

/**
 * Sentry paginates with an RFC 5988 Link header instead of a response-body
 * cursor. A rel="next" link is always present and its cursor keeps advancing
 * even past the last record, so it is only followed while its `results`
 * attribute is "true" — otherwise the loop would fetch empty pages forever.
 */
function extractNextCursor(linkHeader: unknown): string | undefined {
    if (typeof linkHeader !== 'string' || linkHeader.length === 0) {
        return undefined;
    }
    for (const link of linkHeader.split(',')) {
        if (!link.includes('rel="next"')) {
            continue;
        }
        if (!link.includes('results="true"')) {
            return undefined;
        }
        const cursorMatch = /cursor="([^"]+)"/.exec(link);
        return cursorMatch?.[1];
    }
    return undefined;
}

const sync = createSync({
    description: 'Sync cron monitors for a Sentry organization, including schedule configuration and nested monitor environments.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Monitor: MonitorSchema
    },

    exec: async (nango) => {
        // The monitors list endpoint has no modified-since filter, so this sync is
        // always a full refresh guarded by delete tracking. Every run must rescan
        // from page 1 so removed monitors can be detected correctly.

        // A Sentry API token is scoped to a single organization, so the first
        // entry returned here is the organization to sync.
        // https://docs.sentry.io/api/users/list-your-organizations/
        const organizationsResponse = await nango.get<unknown>({
            endpoint: '/0/organizations/',
            retries: 3
        });
        const organizations = z.array(OrganizationSchema).safeParse(organizationsResponse.data);
        const organization = organizations.success ? organizations.data[0] : undefined;
        if (!organization) {
            throw new Error('monitors sync: could not resolve a Sentry organization for this connection.');
        }

        await nango.trackDeletesStart('Monitor');

        let cursor: string | undefined;
        do {
            // https://docs.sentry.io/api/crons/retrieve-monitors-for-an-organization/
            const response = await nango.get<unknown>({
                endpoint: `/0/organizations/${encodeURIComponent(organization.slug)}/monitors/`,
                params: {
                    per_page: 100,
                    ...(cursor !== undefined ? { cursor } : {})
                },
                retries: 3
            });

            const parsed = z.array(MonitorSchema).safeParse(response.data);
            if (!parsed.success) {
                // Inside a delete-tracked scan a skipped page would later be
                // reported as deleted, so parse failures must abort the run.
                throw new Error(`monitors sync: failed to parse Sentry monitors response: ${parsed.error.message}`);
            }

            if (parsed.data.length > 0) {
                await nango.batchSave(parsed.data, 'Monitor');
            }

            cursor = extractNextCursor(response.headers['link']);
        } while (cursor !== undefined);

        await nango.trackDeletesEnd('Monitor');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
