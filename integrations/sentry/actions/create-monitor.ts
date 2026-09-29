import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the Sentry organization that will own the monitor. Example: "nangodev"'),
        project: z.string().describe('Slug of the project to associate the monitor with. Example: "nango-seed-project"'),
        name: z
            .string()
            .describe('Name of the monitor, used in notifications. When slug is omitted, the slug is derived from this name. Example: "Nightly Data Sync"'),
        slug: z
            .string()
            .optional()
            .describe('Unique monitor slug within the organization, used in check-in URLs. Derived from name when omitted. Example: "nightly-data-sync"'),
        status: z
            .enum(['active', 'disabled'])
            .optional()
            .describe('Monitor status. Disabled monitors do not accept check-in events and do not count towards the monitor quota. Defaults to "active".'),
        owner: z.string().optional().describe('Team or user that owns the monitor, prefixed by type. Example: "team:6" or "user:51"'),
        is_muted: z.boolean().optional().describe('When true, disables creation of monitor incidents so missed or failed check-ins open no issues.'),
        config: z
            .object({
                schedule_type: z
                    .enum(['crontab', 'interval'])
                    .describe('Schedule representation: "crontab" for a crontab expression, "interval" for a fixed interval.'),
                schedule: z
                    .union([z.string(), z.tuple([z.number().int().min(1), z.enum(['minute', 'hour', 'day', 'week', 'month', 'year'])])])
                    .describe(
                        'Crontab expression when schedule_type is "crontab" (example: "0 * * * *"), or a [count, unit] tuple when schedule_type is "interval" (example: [1, "day"]), where unit is one of minute, hour, day, week, month, or year.'
                    ),
                checkin_margin: z
                    .number()
                    .int()
                    .min(1)
                    .max(40320)
                    .optional()
                    .describe('Minutes after the expected check-in time to wait before considering the check-in missed. Example: 5'),
                max_runtime: z
                    .number()
                    .int()
                    .min(1)
                    .max(40320)
                    .optional()
                    .describe('Minutes a check-in may remain in progress before it is considered failed. Example: 30'),
                timezone: z
                    .string()
                    .optional()
                    .describe('tz database timezone used to evaluate a crontab schedule. Example: "America/New_York". Defaults to UTC.'),
                failure_issue_threshold: z
                    .number()
                    .int()
                    .min(1)
                    .max(720)
                    .optional()
                    .describe('Number of consecutive failed check-ins before an issue is created. Example: 1'),
                recovery_threshold: z
                    .number()
                    .int()
                    .min(1)
                    .max(720)
                    .optional()
                    .describe('Number of consecutive successful check-ins before a monitor issue is resolved. Example: 1')
            })
            .describe('Schedule and check-in configuration for the monitor.')
    })
    .describe(
        'Parameters for creating a Sentry cron monitor. config.schedule must match config.schedule_type: a crontab string for "crontab" or a [interval, unit] tuple for "interval".'
    );

const MonitorConfigSchema = z.object({
    schedule_type: z.enum(['crontab', 'interval']).optional(),
    schedule: z.union([z.string(), z.tuple([z.number(), z.string()])]).optional(),
    checkin_margin: z.number().nullable().optional(),
    max_runtime: z.number().nullable().optional(),
    timezone: z.string().nullable().optional(),
    failure_issue_threshold: z.number().nullable().optional(),
    recovery_threshold: z.number().nullable().optional(),
    alert_rule_id: z.number().nullable().optional()
});

const SentryMonitorSchema = z.object({
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
    config: MonitorConfigSchema,
    owner: z
        .object({
            type: z.string(),
            id: z.string(),
            name: z.string()
        })
        .nullable()
        .optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier (UUID) of the created monitor. Example: "aaae44c7-6c02-4a69-8117-0f65eb32c562"'),
        name: z.string().describe('Name of the monitor. Example: "Nightly Data Sync"'),
        slug: z.string().describe('Slug uniquely identifying the monitor within the organization, used in check-in URLs. Example: "nightly-data-sync"'),
        status: z.string().describe('Monitor status, either "active" or "disabled".'),
        isMuted: z.boolean().describe('Whether creation of monitor incidents is disabled.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the monitor was created. Example: "2026-09-29T14:35:07.897470Z"'),
        project: z
            .object({
                id: z.string().describe('Numeric ID of the project the monitor is associated with. Example: "4512170111991808"'),
                slug: z.string().describe('Slug of the project the monitor is associated with. Example: "nango-seed-project"'),
                name: z.string().describe('Display name of the project the monitor is associated with. Example: "Nango Seed Project"')
            })
            .describe('Project the monitor is associated with.'),
        config: z
            .object({
                schedule_type: z.enum(['crontab', 'interval']).optional().describe('Schedule representation of the monitor: "crontab" or "interval".'),
                schedule: z
                    .union([z.string(), z.tuple([z.number(), z.string()])])
                    .optional()
                    .describe('Configured schedule: a crontab expression string for "crontab" monitors or a [count, unit] tuple for "interval" monitors.'),
                checkin_margin: z.number().optional().describe('Minutes after the expected check-in time before the check-in is considered missed.'),
                max_runtime: z.number().optional().describe('Minutes a check-in may remain in progress before it is considered failed.'),
                timezone: z.string().optional().describe('tz database timezone used to evaluate a crontab schedule.'),
                failure_issue_threshold: z.number().optional().describe('Number of consecutive failed check-ins before an issue is created.'),
                recovery_threshold: z.number().optional().describe('Number of consecutive successful check-ins before a monitor issue is resolved.')
            })
            .describe('Effective schedule and check-in configuration of the created monitor.'),
        owner: z
            .object({
                type: z.string().describe('Type of the owner, either "user" or "team".'),
                id: z.string().describe('ID of the owning user or team. Example: "6"'),
                name: z.string().describe('Display name of the owning user or team.')
            })
            .optional()
            .describe('Team or user that owns the monitor. Omitted when the monitor has no owner.')
    })
    .describe('The created Sentry cron monitor.');

/**
 * Create a new cron monitor for a project.
 *
 * @tags: [write]
 * @tagReason: Creates a new cron monitor through a POST mutation and performs no provider reads or deletions.
 * @pitfalls: Creation is not idempotent: when slug is omitted it is derived from name, so repeating a call with the same name is rejected for the duplicate slug. A custom slug is limited to 50 lowercase letters, digits, hyphens, or underscores and cannot consist only of digits.
 */
const action = createAction({
    description: 'Create a new cron monitor for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.sentry.io/api/crons/create-a-monitor/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/monitors/`,
            data: {
                project: input.project,
                name: input.name,
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.owner !== undefined && { owner: input.owner }),
                ...(input.is_muted !== undefined && { is_muted: input.is_muted }),
                config: {
                    schedule_type: input.config.schedule_type,
                    schedule: input.config.schedule,
                    ...(input.config.checkin_margin !== undefined && { checkin_margin: input.config.checkin_margin }),
                    ...(input.config.max_runtime !== undefined && { max_runtime: input.config.max_runtime }),
                    ...(input.config.timezone !== undefined && { timezone: input.config.timezone }),
                    ...(input.config.failure_issue_threshold !== undefined && { failure_issue_threshold: input.config.failure_issue_threshold }),
                    ...(input.config.recovery_threshold !== undefined && { recovery_threshold: input.config.recovery_threshold })
                }
            },
            // Creating a monitor is not idempotent: no idempotency key exists and retrying a lost response would repeat the create, so retries are disabled.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const monitor = SentryMonitorSchema.parse(response.data);

        return {
            id: monitor.id,
            name: monitor.name,
            slug: monitor.slug,
            status: monitor.status,
            isMuted: monitor.isMuted,
            dateCreated: monitor.dateCreated,
            project: {
                id: monitor.project.id,
                slug: monitor.project.slug,
                name: monitor.project.name
            },
            config: {
                ...(monitor.config.schedule_type !== undefined && { schedule_type: monitor.config.schedule_type }),
                ...(monitor.config.schedule !== undefined && { schedule: monitor.config.schedule }),
                ...(monitor.config.checkin_margin != null && { checkin_margin: monitor.config.checkin_margin }),
                ...(monitor.config.max_runtime != null && { max_runtime: monitor.config.max_runtime }),
                ...(monitor.config.timezone != null && { timezone: monitor.config.timezone }),
                ...(monitor.config.failure_issue_threshold != null && { failure_issue_threshold: monitor.config.failure_issue_threshold }),
                ...(monitor.config.recovery_threshold != null && { recovery_threshold: monitor.config.recovery_threshold })
            },
            ...(monitor.owner != null && { owner: monitor.owner })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
