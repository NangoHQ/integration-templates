import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().min(1).describe('The ID or slug of the organization the monitor belongs to. Example: "nangodev"'),
        monitor_id_or_slug: z.string().min(1).describe('The ID or slug of the monitor to list check-ins for. Example: "nango-seed-monitor"'),
        cursor: z
            .string()
            .regex(/^-?\d+:-?\d+:\d+$/)
            .optional()
            .describe('Pagination cursor returned as next_cursor by a previous call, in Sentry cursor format. Omit for the first page. Example: "100:1:0"')
    })
    .describe('Input for listing check-ins of a Sentry monitor');

const CheckinMonitorConfigSchema = z
    .object({
        schedule_type: z.enum(['crontab', 'interval']).describe('How the monitor schedule is expressed: as a crontab expression or as a fixed interval'),
        schedule: z
            .union([z.string(), z.array(z.number())])
            .describe('Crontab expression for crontab schedules, or a two-element [value, unit] pair for interval schedules. Example: "0 * * * *"'),
        checkin_margin: z
            .number()
            .nullable()
            .describe('Minutes after the expected check-in time before Sentry marks the check-in as missed; null when not configured'),
        max_runtime: z.number().nullable().describe('Maximum allowed job runtime in minutes before the check-in is marked as failed; null when not configured'),
        timezone: z.string().nullable().describe('Timezone the crontab schedule is evaluated in; null when not configured'),
        failure_issue_threshold: z
            .number()
            .nullable()
            .describe('Number of consecutive failed check-ins before Sentry creates an issue; null when not configured'),
        recovery_threshold: z.number().nullable().describe('Number of consecutive ok check-ins before Sentry resolves the issue; null when not configured'),
        alert_rule_id: z.number().nullable().describe('ID of the alert rule attached to the monitor; null when no alert rule is attached')
    })
    .describe('Configuration of the monitor at the time of the check-in');

const CheckinSchema = z
    .object({
        id: z.string().describe('Unique ID of the check-in'),
        environment: z.string().describe('Name of the environment the check-in was recorded in. Example: "production"'),
        status: z.string().describe('Final state of the check-in: "ok", "error", "in_progress", "missed", or "timeout"'),
        duration: z.number().nullable().describe('Duration of the job in milliseconds; null while the check-in is still in progress'),
        dateCreated: z.string().describe('ISO 8601 timestamp when the check-in was created'),
        dateAdded: z.string().describe('ISO 8601 timestamp when the check-in was added'),
        dateUpdated: z.string().describe('ISO 8601 timestamp when the check-in was last updated'),
        dateInProgress: z
            .string()
            .nullable()
            .describe('ISO 8601 timestamp when the job reported itself as in progress; null when the job never reported starting'),
        dateClock: z.string().describe('ISO 8601 timestamp of the check-in clock Sentry uses for schedule calculations'),
        expectedTime: z.string().describe('ISO 8601 timestamp when the check-in was expected according to the monitor schedule'),
        monitorConfig: CheckinMonitorConfigSchema,
        groups: z.array(z.string()).optional().describe('IDs of the groups (issues) associated with the check-in')
    })
    .describe('A single check-in event recorded for the monitor');

const OutputSchema = z
    .object({
        checkins: z.array(CheckinSchema).describe('Check-in events recorded for the monitor'),
        next_cursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page; omitted when there are no more results')
    })
    .describe('The page of check-ins recorded for the monitor');

function parseNextCursor(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    for (const link of linkHeader.split(',')) {
        const segments = link.split(';');
        const attributes: Record<string, string> = {};
        for (const segment of segments.slice(1)) {
            const separatorIndex = segment.indexOf('=');
            if (separatorIndex > 0) {
                const key = segment.slice(0, separatorIndex).trim();
                const value = segment
                    .slice(separatorIndex + 1)
                    .trim()
                    .replace(/^"|"$/g, '');
                attributes[key] = value;
            }
        }
        if (attributes['rel'] === 'next' && attributes['results'] === 'true' && attributes['cursor']) {
            return attributes['cursor'];
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Only reads check-in records from Sentry; it never creates, updates, or deletes provider data.
 * @pitfalls: Check-ins only exist after a cron job reports to Sentry through its separate ingest mechanism, so a monitor that no job has ever checked into returns an empty list rather than an error.
 */
const action = createAction({
    description: 'List check-in events recorded for a monitor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['alerts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/crons/retrieve-checkins-for-a-monitor/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/monitors/${encodeURIComponent(input.monitor_id_or_slug)}/checkins/`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const checkins = z.array(CheckinSchema).parse(response.data);
        const nextCursor = parseNextCursor(response.headers['link']);

        return {
            checkins,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
