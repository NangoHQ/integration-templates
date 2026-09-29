import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const MonitorConfigInputSchema = z
    .object({
        schedule_type: z
            .enum(['crontab', 'interval'])
            .optional()
            .describe("Schedule type: 'crontab' for a cron expression schedule, 'interval' for a fixed repeating interval."),
        schedule: z
            .union([z.string(), z.tuple([z.number().int().positive(), z.enum(['minute', 'hour', 'day', 'week', 'month', 'year'])])])
            .optional()
            .describe(
                'Schedule matching schedule_type: a crontab expression such as "0 * * * *", or a [count, unit] interval tuple such as [1, "day"] with unit minute, hour, day, week, month, or year.'
            ),
        checkin_margin: z
            .number()
            .int()
            .min(1)
            .max(40320)
            .nullable()
            .optional()
            .describe('Minutes after the expected check-in time to wait before counting the check-in as missed. Set to null to clear.'),
        max_runtime: z
            .number()
            .int()
            .min(1)
            .max(40320)
            .nullable()
            .optional()
            .describe('Minutes a check-in may stay in progress before it is counted as failed. Set to null to clear.'),
        timezone: z.string().optional().describe('IANA time zone used to evaluate a crontab schedule. Example: "America/New_York".'),
        failure_issue_threshold: z
            .number()
            .int()
            .min(1)
            .max(720)
            .nullable()
            .optional()
            .describe('Number of consecutive missed or failed check-ins before a new issue is created. Set to null to clear.'),
        recovery_threshold: z
            .number()
            .int()
            .min(1)
            .max(720)
            .nullable()
            .optional()
            .describe('Number of consecutive successful check-ins before an open monitor issue is resolved. Set to null to clear.')
    })
    .describe('Schedule configuration changes. Only the provided fields are changed; omitted fields keep their current values.');

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('ID or slug of the Sentry organization that owns the monitor. Example: "nangodev".'),
        monitor_id_or_slug: z.string().describe('ID or slug of the monitor to update. Example: "nango-seed-monitor".'),
        name: z.string().max(128).optional().describe('New monitor name. Used in notifications.'),
        slug: z
            .string()
            .max(50)
            .regex(/^(?![0-9]+$)[a-z0-9_-]+$/)
            .optional()
            .describe('New monitor slug: lowercase letters, numbers, underscores, and hyphens; may not be all digits.'),
        config: MonitorConfigInputSchema.optional()
    })
    .describe('Monitor update request. Provide the monitor to change plus at least one of name, slug, or config.');

const MonitorConfigOutputSchema = z
    .object({
        schedule_type: z.enum(['crontab', 'interval']).optional().describe("Schedule type: 'crontab' or 'interval'."),
        schedule: z
            .union([z.string(), z.tuple([z.number().int().positive(), z.string()])])
            .optional()
            .describe('Active schedule: a crontab expression or a [count, unit] interval tuple.'),
        checkin_margin: z.number().optional().describe('Minutes after the expected check-in time before a check-in counts as missed. Absent when unset.'),
        max_runtime: z.number().optional().describe('Minutes a check-in may stay in progress before it counts as failed. Absent when unset.'),
        timezone: z.string().optional().describe('IANA time zone of the schedule. Absent when unset.'),
        failure_issue_threshold: z.number().optional().describe('Consecutive missed or failed check-ins before a new issue is created. Absent when unset.'),
        recovery_threshold: z.number().optional().describe('Consecutive successful check-ins before an open issue is resolved. Absent when unset.')
    })
    .describe('Current schedule configuration of the monitor.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique monitor ID (UUID).'),
        name: z.string().describe('Monitor name.'),
        slug: z.string().describe('Monitor slug, unique within the organization.'),
        status: z.string().describe('Monitor status, e.g. "active" or "disabled".'),
        isMuted: z.boolean().describe('Whether creation of monitor incidents is disabled.'),
        isUpserting: z.boolean().describe('Whether the monitor is being auto-created by an in-flight check-in.'),
        dateCreated: z.string().describe('ISO 8601 timestamp of when the monitor was created.'),
        config: MonitorConfigOutputSchema,
        project: z
            .object({
                id: z.string().describe('Numeric project ID.'),
                slug: z.string().describe('Project slug.'),
                name: z.string().describe('Project name.'),
                platform: z.string().optional().describe('Project platform key, e.g. "node". Absent when the project has no platform set.')
            })
            .describe('Project the monitor is attached to.'),
        environments: z
            .array(
                z
                    .object({
                        name: z.string().describe('Environment name.'),
                        status: z.string().optional().describe('Environment status, e.g. "active".'),
                        isMuted: z.boolean().optional().describe('Whether monitor incidents are muted in this environment.'),
                        lastCheckIn: z.string().optional().describe('ISO 8601 timestamp of the last check-in received in this environment. Absent when none.'),
                        nextCheckIn: z.string().optional().describe('ISO 8601 timestamp of the next expected check-in in this environment. Absent when none.')
                    })
                    .describe('Monitor state within one environment.')
            )
            .describe('Environments the monitor has received check-ins from.'),
        owner: z
            .object({
                type: z.enum(['user', 'team']).describe('Owner type.'),
                id: z.string().describe('ID of the owning user or team.'),
                name: z.string().describe('Display name of the owning user or team.')
            })
            .optional()
            .describe('User or team that owns the monitor. Absent when the monitor is unassigned.')
    })
    .describe('The updated monitor.');

const ProviderMonitorSchema = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    status: z.string(),
    isMuted: z.boolean(),
    isUpserting: z.boolean(),
    dateCreated: z.string(),
    config: z.object({
        schedule_type: z.enum(['crontab', 'interval']).optional(),
        schedule: z.union([z.string(), z.tuple([z.number(), z.string()])]).optional(),
        checkin_margin: z.number().nullable().optional(),
        max_runtime: z.number().nullable().optional(),
        timezone: z.string().nullable().optional(),
        failure_issue_threshold: z.number().nullable().optional(),
        recovery_threshold: z.number().nullable().optional()
    }),
    project: z.object({
        id: z.string(),
        slug: z.string(),
        name: z.string(),
        platform: z.string().nullable().optional()
    }),
    environments: z.array(
        z.object({
            name: z.string(),
            status: z.string().optional(),
            isMuted: z.boolean().optional(),
            lastCheckIn: z.string().nullable().optional(),
            nextCheckIn: z.string().nullable().optional()
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

/**
 * @tags: [write]
 * @tagReason: Mutates a Sentry monitor's name, slug, or schedule configuration and performs no provider reads.
 * @pitfalls: Changing the slug requires updating any instrumented check-in calls that reference the old slug; updating the name alone does not change the slug. Config fields are merged into the existing monitor config, so omitted config fields keep their current values.
 */
const action = createAction({
    description: "Update a monitor's name, slug, or schedule config.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.name === undefined && input.slug === undefined && input.config === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one field to update: name, slug, or config.'
            });
        }

        const proxyConfig: ProxyConfiguration = {
            // https://docs.sentry.io/api/crons/update-a-monitor/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/monitors/${encodeURIComponent(input.monitor_id_or_slug)}/`,
            // A replayed PUT after a lost response can 404: once a slug rename in this same request has already been applied, monitor_id_or_slug
            // (when it identifies the monitor by its old slug) no longer resolves, so this mutation is not auto-retried.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.config !== undefined && { config: input.config })
            }
        };
        const response = await nango.put(proxyConfig);

        const monitor = ProviderMonitorSchema.parse(response.data);

        return {
            id: monitor.id,
            name: monitor.name,
            slug: monitor.slug,
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
                ...(monitor.config.recovery_threshold != null && { recovery_threshold: monitor.config.recovery_threshold })
            },
            project: {
                id: monitor.project.id,
                slug: monitor.project.slug,
                name: monitor.project.name,
                ...(monitor.project.platform != null && { platform: monitor.project.platform })
            },
            environments: monitor.environments.map((environment) => ({
                name: environment.name,
                ...(environment.status !== undefined && { status: environment.status }),
                ...(environment.isMuted !== undefined && { isMuted: environment.isMuted }),
                ...(environment.lastCheckIn != null && { lastCheckIn: environment.lastCheckIn }),
                ...(environment.nextCheckIn != null && { nextCheckIn: environment.nextCheckIn })
            })),
            ...(monitor.owner != null && {
                owner: {
                    type: monitor.owner.type,
                    id: monitor.owner.id,
                    name: monitor.owner.name
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
