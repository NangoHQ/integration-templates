import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization that owns the monitors. Example: "nangodev".'),
        project: z
            .array(z.string())
            .optional()
            .describe('Project IDs or slugs to filter monitors by. Repeatable on the Sentry API. Example: ["nango-seed-project"].'),
        environment: z.array(z.string()).optional().describe('Environment names to filter monitors by. Repeatable on the Sentry API. Example: ["production"].'),
        cursor: z.string().min(1).optional().describe('Opaque pagination cursor from a previous response next_cursor. Omit for the first page.')
    })
    .describe('Filters for listing cron monitors of a Sentry organization.');

const MonitorConfigSchema = z
    .object({
        schedule_type: z.enum(['crontab', 'interval']).describe('Schedule kind: "crontab" for a cron expression, "interval" for a fixed interval.'),
        schedule: z
            .union([z.string(), z.tuple([z.number(), z.string()])])
            .describe('Cron expression for crontab schedules (e.g. "0 * * * *"), or a [count, unit] tuple such as [1, "day"] for interval schedules.'),
        checkin_margin: z.number().optional().describe('Minutes after the expected check-in time before the monitor is marked missed.'),
        max_runtime: z.number().optional().describe('Minutes a check-in may run before the monitor is marked as timed out.'),
        timezone: z.string().optional().describe('IANA timezone the schedule is evaluated in. Example: "America/Los_Angeles".'),
        failure_issue_threshold: z.number().optional().describe('Number of consecutive failed check-ins before an issue is created.'),
        recovery_threshold: z.number().optional().describe('Number of consecutive successful check-ins before the monitor recovers.')
    })
    .describe('Check-in schedule and alerting configuration of the monitor.');

const MonitorEnvironmentSchema = z
    .object({
        name: z.string().describe('Environment name. Example: "production".'),
        status: z.string().describe('Monitor health in this environment, e.g. "ok", "error", "missed_checkin", "timeout" or "disabled".'),
        isMuted: z.boolean().describe('Whether alerting is muted for this monitor environment.'),
        dateCreated: z.string().describe('ISO 8601 timestamp when the monitor environment was created.'),
        lastCheckIn: z.string().optional().describe('ISO 8601 timestamp of the last check-in. Omitted when the monitor never checked in here.'),
        nextCheckIn: z.string().optional().describe('ISO 8601 timestamp of the next expected check-in. Omitted when none is scheduled.'),
        nextCheckInLatest: z
            .string()
            .optional()
            .describe('ISO 8601 timestamp of the latest acceptable next check-in, including the check-in margin. Omitted when none is scheduled.')
    })
    .describe('Per-environment check-in state of a cron monitor.');

const MonitorOwnerSchema = z
    .object({
        type: z.enum(['user', 'team']).describe('Whether the owner is a user or a team.'),
        id: z.string().describe('ID of the owning user or team.'),
        name: z.string().describe('Display name of the owning user or team.')
    })
    .describe('User or team the monitor is assigned to.');

const MonitorSchema = z
    .object({
        id: z.string().describe('Unique ID of the monitor.'),
        name: z.string().describe('Display name of the monitor.'),
        slug: z.string().describe('URL-friendly slug of the monitor, unique within the organization.'),
        status: z.string().describe('Monitor status, e.g. "active" or "disabled".'),
        isMuted: z.boolean().describe('Whether alerting is muted for the monitor.'),
        dateCreated: z.string().describe('ISO 8601 timestamp when the monitor was created.'),
        project: z
            .object({
                id: z.string().describe('ID of the project the monitor belongs to.'),
                slug: z.string().describe('Slug of the project the monitor belongs to.'),
                name: z.string().describe('Name of the project the monitor belongs to.')
            })
            .describe('Project the monitor belongs to.'),
        config: MonitorConfigSchema,
        environments: z.array(MonitorEnvironmentSchema).describe('Per-environment check-in state. Empty until the monitor receives check-ins.'),
        owner: MonitorOwnerSchema.optional().describe('User or team the monitor is assigned to. Omitted when unassigned.')
    })
    .describe('A Sentry cron monitor.');

const OutputSchema = z
    .object({
        monitors: z.array(MonitorSchema).describe('Cron monitors matching the filters.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page. Omitted when there are no more results.')
    })
    .describe('Page of cron monitors and the cursor for the next page.');

const ProviderMonitorSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    status: z.string(),
    isMuted: z.boolean(),
    dateCreated: z.string(),
    project: z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string()
    }),
    config: z.object({
        schedule_type: z.enum(['crontab', 'interval']),
        schedule: z.union([z.string(), z.tuple([z.number(), z.string()])]),
        checkin_margin: z.number().nullable().optional(),
        max_runtime: z.number().nullable().optional(),
        timezone: z.string().nullable().optional(),
        failure_issue_threshold: z.number().nullable().optional(),
        recovery_threshold: z.number().nullable().optional()
    }),
    environments: z.array(
        z.object({
            name: z.string(),
            status: z.string(),
            isMuted: z.boolean(),
            dateCreated: z.string(),
            lastCheckIn: z.string().nullable().optional(),
            nextCheckIn: z.string().nullable().optional(),
            nextCheckInLatest: z.string().nullable().optional()
        })
    ),
    owner: z
        .object({
            type: z.enum(['user', 'team']),
            id: z.string(),
            name: z.string()
        })
        .nullable()
        .optional()
});

function parseNextCursor(linkHeader: string): string | undefined {
    for (const part of linkHeader.split(',')) {
        if (!part.includes('rel="next"')) {
            continue;
        }
        if (part.includes('results="false"')) {
            return undefined;
        }
        const cursorMatch = /cursor="([^"]+)"/.exec(part);
        return cursorMatch ? cursorMatch[1] : undefined;
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Makes a single read-only GET request to list monitors; it never creates, modifies, or deletes provider data.
 * @pitfalls: Filtering by a project that does not exist or is inaccessible to the token fails with a 403 permission error instead of returning an empty list, and filtering by an unknown environment name fails with a 400 error. A monitor's environments array stays empty until it receives check-ins, so filtering by an otherwise valid environment can still return no monitors.
 */
const action = createAction({
    description: 'List cron monitors for the organization, optionally filtered by project or environment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Sentry expects repeated query params (?project=a&project=b), which Nango's params object cannot express, so build the query string.
        const queryParts: string[] = [];
        for (const project of input.project ?? []) {
            queryParts.push(`project=${encodeURIComponent(project)}`);
        }
        for (const environment of input.environment ?? []) {
            queryParts.push(`environment=${encodeURIComponent(environment)}`);
        }
        if (input.cursor !== undefined) {
            queryParts.push(`cursor=${encodeURIComponent(input.cursor)}`);
        }

        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/crons/retrieve-monitors-for-an-organization/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/monitors/`,
            ...(queryParts.length > 0 && { params: queryParts.join('&') }),
            retries: 3
        };

        const response = await nango.get<unknown>(config);

        const parsed = z.array(ProviderMonitorSchema).parse(response.data);

        const monitors = parsed.map((monitor): z.infer<typeof MonitorSchema> => {
            return {
                id: monitor.id,
                name: monitor.name,
                slug: monitor.slug,
                status: monitor.status,
                isMuted: monitor.isMuted,
                dateCreated: monitor.dateCreated,
                project: monitor.project,
                config: {
                    schedule_type: monitor.config.schedule_type,
                    schedule: monitor.config.schedule,
                    ...(monitor.config.checkin_margin != null && { checkin_margin: monitor.config.checkin_margin }),
                    ...(monitor.config.max_runtime != null && { max_runtime: monitor.config.max_runtime }),
                    ...(monitor.config.timezone != null && { timezone: monitor.config.timezone }),
                    ...(monitor.config.failure_issue_threshold != null && { failure_issue_threshold: monitor.config.failure_issue_threshold }),
                    ...(monitor.config.recovery_threshold != null && { recovery_threshold: monitor.config.recovery_threshold })
                },
                environments: monitor.environments.map((environment) => {
                    return {
                        name: environment.name,
                        status: environment.status,
                        isMuted: environment.isMuted,
                        dateCreated: environment.dateCreated,
                        ...(environment.lastCheckIn != null && { lastCheckIn: environment.lastCheckIn }),
                        ...(environment.nextCheckIn != null && { nextCheckIn: environment.nextCheckIn }),
                        ...(environment.nextCheckInLatest != null && { nextCheckInLatest: environment.nextCheckInLatest })
                    };
                }),
                ...(monitor.owner != null && { owner: monitor.owner })
            };
        });

        const linkHeader = response.headers['link'];
        const nextCursor = typeof linkHeader === 'string' ? parseNextCursor(linkHeader) : undefined;

        return {
            monitors,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
