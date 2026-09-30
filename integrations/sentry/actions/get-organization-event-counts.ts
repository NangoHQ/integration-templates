import { z } from 'zod';
import { createAction } from 'nango';

// Verified against the live stats_v2 endpoint: it accepts any interval down to 1 minute, but
// rejects one that does not evenly divide a day ("The interval should divide one day without a
// remainder.") and one longer than a day ("The interval has to be less than one day.").
function isValidStatsInterval(value: string): boolean {
    const match = /^(\d+)([mhdw])$/.exec(value);
    if (!match) {
        return false;
    }
    let minutesPerUnit: number;
    switch (match[2]) {
        case 'm':
            minutesPerUnit = 1;
            break;
        case 'h':
            minutesPerUnit = 60;
            break;
        case 'd':
            minutesPerUnit = 1440;
            break;
        case 'w':
            minutesPerUnit = 10080;
            break;
        default:
            return false;
    }
    const minutes = Number(match[1]) * minutesPerUnit;
    return minutes > 0 && minutes <= 1440 && 1440 % minutes === 0;
}

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization to query event counts for. Example: "nangodev".'),
        groupBy: z
            .array(z.enum(['outcome', 'category', 'reason', 'project']))
            .min(1)
            .describe('Dimension(s) to group counts by. Pass multiple values to group by multiple dimensions, e.g. ["project", "outcome"].'),
        field: z
            .enum(['sum(quantity)', 'sum(times_seen)'])
            .describe(
                'Aggregation to compute per group and interval. "sum(quantity)" is the event count (bytes for attachments); "sum(times_seen)" counts how many times an event has been seen.'
            ),
        statsPeriod: z
            .string()
            .regex(/^\d+[mhdw]$/)
            .optional()
            .describe(
                'Relative time window in <number><unit> format, e.g. "24h" or "7d" (units: m, h, d, w). Provide either this or both start and end; defaults to the last 90 days.'
            ),
        interval: z
            .string()
            .regex(/^\d+[mhdw]$/)
            .refine(isValidStatsInterval, {
                message: 'Interval must evenly divide one day (1440 minutes) and be at most "1d", e.g. "1h", "6h", "12h", "1d".'
            })
            .optional()
            .describe(
                'Resolution of the time series in the same <number><unit> format as statsPeriod. At most "1d", and must evenly divide one day (1440 minutes), e.g. "1h", "6h", "12h", "1d".'
            ),
        start: z
            .string()
            .optional()
            .describe(
                'Start of the time window as a UTC ISO 8601 datetime or epoch seconds. Use together with end instead of statsPeriod. Example: "2026-09-28T00:00:00Z".'
            ),
        end: z
            .string()
            .optional()
            .describe('Inclusive end of the time window as a UTC ISO 8601 datetime or epoch seconds. Use together with start instead of statsPeriod.'),
        project: z
            .array(z.string())
            .optional()
            .describe('Project IDs to filter by. Use ["-1"] to include all accessible projects. Example: ["4512170111991808"].'),
        category: z
            .enum([
                'error',
                'transaction',
                'attachment',
                'replay',
                'profile',
                'profile_duration',
                'profile_duration_ui',
                'profile_chunk',
                'profile_chunk_ui',
                'monitor'
            ])
            .optional()
            .describe(
                'Filter by data category, e.g. "error" for error events or "transaction" for transaction events. "attachment", "profile_duration", "profile_duration_ui" and "profile_chunk_ui" cannot be combined with other categories.'
            ),
        outcome: z
            .enum(['accepted', 'filtered', 'rate_limited', 'invalid', 'abuse', 'client_discard', 'cardinality_limited'])
            .optional()
            .describe('Filter by outcome status, e.g. "accepted" for stored events or "rate_limited" for events dropped by rate limiting.'),
        reason: z.string().optional().describe('Filter by the reason events were filtered or dropped, e.g. "spike_protection".')
    })
    .refine((input) => input.groupBy.includes('category') || input.category !== undefined, {
        message: 'Sentry requires "category" as a groupBy dimension or as a category filter (verified live: omitting both returns a 400).',
        path: ['groupBy']
    })
    .describe('Dimensions, aggregation field, time window, and filters for the organization event-counts query.');

const GroupSchema = z
    .object({
        by: z
            .record(z.string(), z.union([z.string(), z.number()]))
            .describe(
                'Values of the requested groupBy dimensions for this group, e.g. {"category": "error"} or {"project": 4512170111991808, "outcome": "accepted"}.'
            ),
        totals: z
            .record(z.string(), z.number())
            .describe('Total for each requested field (keyed by field name, e.g. "sum(quantity)") across the entire time window.'),
        series: z
            .record(z.string(), z.array(z.number()))
            .optional()
            .describe(
                'Per-interval value for each requested field, aligned with the top-level intervals array. Omitted when grouping by project, which returns totals only.'
            )
    })
    .describe('Event counts for one distinct combination of groupBy dimension values.');

const OutputSchema = z
    .object({
        start: z.string().describe('Start of the resolved time window as an ISO 8601 UTC timestamp.'),
        end: z.string().describe('End of the resolved time window as an ISO 8601 UTC timestamp.'),
        intervals: z
            .array(z.string())
            .optional()
            .describe('Start timestamp of each time bucket as an ISO 8601 UTC timestamp. Omitted when grouping by project.'),
        groups: z.array(GroupSchema).describe('One entry per distinct combination of groupBy dimension values found in the time window.')
    })
    .describe('Time-bucketed event counts for the organization, grouped by the requested dimensions.');

/**
 * @tags: [read]
 * @tagReason: Only issues a read-only GET against Sentry's stats_v2 endpoint; it never mutates organization data.
 * @pitfalls: Every query must include "category" as a groupBy dimension or as a filter, otherwise Sentry rejects the request with a 400. Grouping by "project" returns totals only (no intervals or per-interval series) and can silently drop rows when the organization has many projects.
 */
const action = createAction({
    description: 'Get event counts for the organization grouped and time-bucketed by an arbitrary dimension (category, project, outcome, etc.).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Sentry parses groupBy and project with getlist(), so they must be sent as repeated
        // query params; build the query string explicitly because object params cannot repeat keys.
        const query = new URLSearchParams();
        for (const dimension of input.groupBy) {
            query.append('groupBy', dimension);
        }
        query.set('field', input.field);
        if (input.statsPeriod !== undefined) {
            query.set('statsPeriod', input.statsPeriod);
        }
        if (input.interval !== undefined) {
            query.set('interval', input.interval);
        }
        if (input.start !== undefined) {
            query.set('start', input.start);
        }
        if (input.end !== undefined) {
            query.set('end', input.end);
        }
        if (input.project !== undefined) {
            for (const projectId of input.project) {
                query.append('project', projectId);
            }
        }
        if (input.category !== undefined) {
            query.set('category', input.category);
        }
        if (input.outcome !== undefined) {
            query.set('outcome', input.outcome);
        }
        if (input.reason !== undefined) {
            query.set('reason', input.reason);
        }

        // https://docs.sentry.io/api/organizations/retrieve-event-counts-for-an-organization-v2/
        const response = await nango.get({
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/stats_v2/`,
            params: `?${query.toString()}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
