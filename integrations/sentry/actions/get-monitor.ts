import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the organization the monitor belongs to. Example: "nangodev"'),
        monitor_id_or_slug: z.string().describe('ID (GUID) or slug of the monitor. Example: "nango-seed-monitor"')
    })
    .describe('Input for retrieving a single Sentry monitor (Crons)');

const MonitorConfigSchema = z.object({
    schedule_type: z.string().optional().describe('Schedule kind: "crontab" or "interval"'),
    schedule: z
        .union([z.string(), z.tuple([z.number(), z.string()])])
        .optional()
        .describe('Crontab expression for crontab monitors, or a [count, unit] tuple for interval monitors. Example: "0 * * * *"'),
    checkin_margin: z.number().optional().describe('Minutes after the expected check-in time before the check-in is considered missed'),
    max_runtime: z.number().optional().describe('Minutes an in-progress check-in may run before it is considered timed out'),
    timezone: z.string().optional().describe('IANA timezone the crontab schedule is evaluated in. Example: "America/New_York"'),
    failure_issue_threshold: z.number().optional().describe('Consecutive failed check-ins required before an issue is created'),
    recovery_threshold: z.number().optional().describe('Consecutive successful check-ins required before an open issue is resolved'),
    alert_rule_id: z.number().optional().describe('ID of the alert rule attached to the monitor, when set')
});

const MonitorProjectSchema = z.object({
    id: z.string().describe('Numeric project ID. Example: "4512170111991808"'),
    slug: z.string().describe('URL-friendly project slug. Example: "nango-seed-project"'),
    name: z.string().describe('Human-readable project name'),
    platform: z.string().optional().describe('Project platform key. Example: "node"'),
    dateCreated: z.string().optional().describe('ISO 8601 timestamp when the project was created'),
    status: z.string().optional().describe('Project status. Example: "active"')
});

const MonitorEnvironmentSchema = z.object({
    name: z.string().describe('Environment name. Example: "production"'),
    status: z.string().optional().describe('Monitor status within this environment. Example: "ok"'),
    isMuted: z.boolean().optional().describe('Whether the monitor is muted in this environment'),
    dateCreated: z.string().optional().describe('ISO 8601 timestamp when the monitor environment was created'),
    lastCheckIn: z.string().optional().describe('ISO 8601 timestamp of the most recent check-in in this environment'),
    nextCheckIn: z.string().optional().describe('ISO 8601 timestamp of the next expected check-in in this environment'),
    nextCheckInLatest: z.string().optional().describe('ISO 8601 timestamp of the latest acceptable next check-in before it counts as missed'),
    activeIncident: z
        .object({
            startingTimestamp: z.string().optional().describe('ISO 8601 timestamp when the active incident started'),
            resolvingTimestamp: z.string().optional().describe('ISO 8601 timestamp when the active incident began resolving; omitted while still failing')
        })
        .optional()
        .describe('Currently active incident for this environment; omitted when the environment is healthy')
});

const MonitorOwnerSchema = z.object({
    type: z.string().describe('Kind of actor owning the monitor: "user" or "team"'),
    id: z.string().describe('Owner ID. Example: "15174593"'),
    name: z.string().describe('Owner display name'),
    email: z.string().optional().describe('Owner email address, present when the owner is a user')
});

const MonitorAlertRuleSchema = z.object({
    environment: z.string().describe('Environment the alert rule evaluates. Example: "production"'),
    targets: z
        .array(
            z.object({
                targetIdentifier: z.number().describe('Numeric identifier of the notification target, such as a member or team ID'),
                targetType: z.string().describe('Kind of notification target. Example: "Member"')
            })
        )
        .describe('Notification targets the alert rule sends to')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Monitor ID (GUID). Example: "aaae44c7-6c02-4a69-8117-0f65eb32c562"'),
        slug: z.string().describe('URL-friendly monitor slug. Example: "nango-seed-monitor"'),
        name: z.string().describe('Human-readable monitor name'),
        status: z.string().describe('Monitor status. Example: "active"'),
        isMuted: z.boolean().describe('Whether the monitor is muted and will not create issues'),
        isUpserting: z.boolean().describe('Whether the monitor is currently being created or updated by an upserting check-in'),
        dateCreated: z.string().describe('ISO 8601 timestamp when the monitor was created'),
        config: MonitorConfigSchema.describe('Check-in schedule and alerting thresholds for the monitor'),
        project: MonitorProjectSchema.describe('Project the monitor belongs to'),
        environments: z.array(MonitorEnvironmentSchema).describe('Per-environment check-in state; empty until the monitor receives check-ins'),
        owner: MonitorOwnerSchema.optional().describe('User or team owning the monitor; omitted when unassigned'),
        alertRule: MonitorAlertRuleSchema.optional().describe('Alert rule attached to the monitor; omitted when none is configured')
    })
    .describe('Details of a single Sentry monitor (Crons)');

const MonitorResponseSchema = z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    status: z.string(),
    isMuted: z.boolean(),
    isUpserting: z.boolean(),
    dateCreated: z.string(),
    config: z.object({
        schedule_type: z.string().optional(),
        schedule: z.union([z.string(), z.tuple([z.number(), z.string()])]).optional(),
        checkin_margin: z.number().nullish(),
        max_runtime: z.number().nullish(),
        timezone: z.string().nullish(),
        failure_issue_threshold: z.number().nullish(),
        recovery_threshold: z.number().nullish(),
        alert_rule_id: z.number().nullish()
    }),
    project: z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string(),
        platform: z.string().nullish(),
        dateCreated: z.string().optional(),
        status: z.string().optional()
    }),
    environments: z.array(
        z.object({
            name: z.string(),
            status: z.string().optional(),
            isMuted: z.boolean().optional(),
            dateCreated: z.string().optional(),
            lastCheckIn: z.string().nullish(),
            nextCheckIn: z.string().nullish(),
            nextCheckInLatest: z.string().nullish(),
            activeIncident: z
                .object({
                    startingTimestamp: z.string().optional(),
                    resolvingTimestamp: z.string().nullish()
                })
                .nullish()
        })
    ),
    owner: z
        .object({
            type: z.string(),
            id: z.string(),
            name: z.string(),
            email: z.string().nullish()
        })
        .nullish(),
    alertRule: z
        .object({
            environment: z.string(),
            targets: z.array(
                z.object({
                    targetIdentifier: z.number(),
                    targetType: z.string()
                })
            )
        })
        .nullish()
});

/**
 * @tags: [read]
 * @tagReason: Performs a single GET to fetch an existing monitor's details and changes nothing in Sentry.
 * @pitfalls: The connection's API token must carry an alerts or project read/write scope (alerts:read, alerts:write, project:read, project:write, or project:admin) or Sentry returns 403. config.schedule changes shape with schedule_type: a crontab string for "crontab" monitors, a two-element [interval, unit] array for "interval" monitors.
 */
const action = createAction({
    description: "Retrieve a single monitor's details.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/crons/retrieve-a-monitor/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/monitors/${encodeURIComponent(input.monitor_id_or_slug)}/`,
            retries: 3
        });

        const monitor = MonitorResponseSchema.parse(response.data);

        return {
            id: monitor.id,
            slug: monitor.slug,
            name: monitor.name,
            status: monitor.status,
            isMuted: monitor.isMuted,
            isUpserting: monitor.isUpserting,
            dateCreated: monitor.dateCreated,
            config: {
                ...(monitor.config.schedule_type !== undefined && { schedule_type: monitor.config.schedule_type }),
                ...(monitor.config.schedule !== undefined && { schedule: monitor.config.schedule }),
                ...(monitor.config.checkin_margin != null && { checkin_margin: monitor.config.checkin_margin }),
                ...(monitor.config.max_runtime != null && { max_runtime: monitor.config.max_runtime }),
                ...(monitor.config.timezone != null && { timezone: monitor.config.timezone }),
                ...(monitor.config.failure_issue_threshold != null && { failure_issue_threshold: monitor.config.failure_issue_threshold }),
                ...(monitor.config.recovery_threshold != null && { recovery_threshold: monitor.config.recovery_threshold }),
                ...(monitor.config.alert_rule_id != null && { alert_rule_id: monitor.config.alert_rule_id })
            },
            project: {
                id: monitor.project.id,
                slug: monitor.project.slug,
                name: monitor.project.name,
                ...(monitor.project.platform != null && { platform: monitor.project.platform }),
                ...(monitor.project.dateCreated !== undefined && { dateCreated: monitor.project.dateCreated }),
                ...(monitor.project.status !== undefined && { status: monitor.project.status })
            },
            environments: monitor.environments.map((environment) => ({
                name: environment.name,
                ...(environment.status !== undefined && { status: environment.status }),
                ...(environment.isMuted !== undefined && { isMuted: environment.isMuted }),
                ...(environment.dateCreated !== undefined && { dateCreated: environment.dateCreated }),
                ...(environment.lastCheckIn != null && { lastCheckIn: environment.lastCheckIn }),
                ...(environment.nextCheckIn != null && { nextCheckIn: environment.nextCheckIn }),
                ...(environment.nextCheckInLatest != null && { nextCheckInLatest: environment.nextCheckInLatest }),
                ...(environment.activeIncident != null && {
                    activeIncident: {
                        ...(environment.activeIncident.startingTimestamp !== undefined && { startingTimestamp: environment.activeIncident.startingTimestamp }),
                        ...(environment.activeIncident.resolvingTimestamp != null && { resolvingTimestamp: environment.activeIncident.resolvingTimestamp })
                    }
                })
            })),
            ...(monitor.owner != null && {
                owner: {
                    type: monitor.owner.type,
                    id: monitor.owner.id,
                    name: monitor.owner.name,
                    ...(monitor.owner.email != null && { email: monitor.owner.email })
                }
            }),
            ...(monitor.alertRule != null && {
                alertRule: {
                    environment: monitor.alertRule.environment,
                    targets: monitor.alertRule.targets
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
