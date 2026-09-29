import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z
            .string()
            .describe('The ID or slug of the organization to summarize event counts for. Example: "nangodev" or "4512170041409536".'),
        field: z
            .enum(['sum(quantity)', 'sum(times_seen)'])
            .describe(
                'Aggregation to return. "sum(quantity)" is bytes for attachments and the event count for all other categories; "sum(times_seen)" sums the number of times an event has been seen. Example: "sum(quantity)".'
            ),
        statsPeriod: z
            .string()
            .optional()
            .describe(
                'Relative time range for the summary in "<number><unit>" format (units: m, h, d, w). Provide either this or both start and end. Example: "24h".'
            ),
        interval: z
            .string()
            .optional()
            .describe(
                'Resolution of the aggregation, in the same "<number><unit>" format as statsPeriod. Defaults to "1h"; the minimum is "1h", intervals larger than "1d" are not supported, and the interval must cleanly divide one day. Example: "1h".'
            ),
        start: z
            .string()
            .optional()
            .describe(
                'Explicit start of the time range as a UTC ISO8601 datetime or epoch seconds. Use together with end instead of statsPeriod. Example: "2026-09-28T00:00:00Z".'
            ),
        end: z
            .string()
            .optional()
            .describe(
                'Explicit inclusive end of the time range as a UTC ISO8601 datetime or epoch seconds. Use together with start instead of statsPeriod. Example: "2026-09-29T00:00:00Z".'
            ),
        project: z
            .array(z.string())
            .optional()
            .describe('Project IDs to restrict the summary to. Omit to include every accessible project in the organization. Example: ["4512170111991808"].'),
        category: z
            .enum(['error', 'transaction', 'attachment', 'replays', 'profiles'])
            .optional()
            .describe(
                'Event category to filter by. "attachment" cannot be combined with other categories; "error" automatically includes the default and security categories.'
            ),
        outcome: z
            .enum(['accepted', 'filtered', 'rate_limited', 'invalid', 'abuse', 'client_discard', 'cardinality_limited'])
            .optional()
            .describe('Outcome status to filter by. See https://docs.sentry.io/product/stats/ for outcome definitions. Example: "accepted".'),
        reason: z.string().optional().describe('Filter by the reason events were filtered or dropped, e.g. a specific inbound filter or rate-limit reason.')
    })
    .describe('Parameters for retrieving summarized event counts per project. Either statsPeriod or both start and end must be provided.');

const OutcomesSchema = z
    .object({
        accepted: z.number().optional().describe('Count of events that were accepted and stored.'),
        filtered: z.number().optional().describe('Count of events dropped by inbound filters.'),
        rate_limited: z.number().optional().describe('Count of events dropped due to rate limiting.'),
        invalid: z.number().optional().describe('Count of events rejected as invalid.'),
        abuse: z.number().optional().describe('Count of events dropped by abuse protection.'),
        client_discard: z.number().optional().describe('Count of events discarded by the SDK before sending.'),
        cardinality_limited: z.number().optional().describe('Count of events dropped due to cardinality limits.')
    })
    .describe('Event counts broken down by outcome status.');

const ProjectStatBucketSchema = z
    .object({
        category: z.string().describe('Event category this bucket aggregates, e.g. "error" or "transaction".'),
        outcomes: OutcomesSchema,
        totals: z.record(z.string(), z.number()).describe('Totals for the bucket: the "dropped" count plus the requested field key, e.g. "sum(quantity)".')
    })
    .describe('Aggregated event counts for one event category within a project.');

const ProjectStatsSchema = z
    .object({
        id: z.number().describe('Numeric project ID. Example: 4512170111991808.'),
        slug: z.string().describe('URL-friendly project slug. Example: "nango-seed-project".'),
        stats: z.array(ProjectStatBucketSchema).describe('Aggregated outcome buckets for this project over the requested window, one per event category.')
    })
    .describe('Summarized event counts for a single project.');

const OutputSchema = z
    .object({
        start: z.string().describe('Start of the summarized time window as an ISO8601 UTC timestamp. Example: "2026-09-28T00:00:00Z".'),
        end: z.string().describe('End of the summarized time window as an ISO8601 UTC timestamp. Example: "2026-09-29T00:00:00Z".'),
        projects: z.array(ProjectStatsSchema).describe('Per-project summarized event counts for the requested window.')
    })
    .describe('Summarized accepted, filtered, and dropped event counts per project for the requested time window.');

/**
 * @tags: [read]
 * @tagReason: Only performs a GET request for aggregated event-count statistics; it never mutates provider data.
 * @pitfalls: You must pass either statsPeriod or both start and end, otherwise Sentry rejects the request. Filtering by a project that does not exist or that the token cannot access fails the entire request with a 403 permission error instead of returning empty or partial results. For the "attachment" category, sum(quantity) reports bytes stored rather than an event count.
 */
const action = createAction({
    description: 'Get accepted, filtered, and dropped event counts per project for the organization over a time window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Sentry reads repeated `project` query params (request.GET.getlist), and the Nango proxy comma-joins array
        // params, which Sentry would treat as a single invalid project slug. Serialize the query string manually so
        // each project ID is sent as its own `project` parameter.
        const queryParts: string[] = [`field=${encodeURIComponent(input.field)}`];
        if (input.statsPeriod !== undefined) {
            queryParts.push(`statsPeriod=${encodeURIComponent(input.statsPeriod)}`);
        }
        if (input.interval !== undefined) {
            queryParts.push(`interval=${encodeURIComponent(input.interval)}`);
        }
        if (input.start !== undefined) {
            queryParts.push(`start=${encodeURIComponent(input.start)}`);
        }
        if (input.end !== undefined) {
            queryParts.push(`end=${encodeURIComponent(input.end)}`);
        }
        for (const projectId of input.project ?? []) {
            queryParts.push(`project=${encodeURIComponent(projectId)}`);
        }
        if (input.category !== undefined) {
            queryParts.push(`category=${encodeURIComponent(input.category)}`);
        }
        if (input.outcome !== undefined) {
            queryParts.push(`outcome=${encodeURIComponent(input.outcome)}`);
        }
        if (input.reason !== undefined) {
            queryParts.push(`reason=${encodeURIComponent(input.reason)}`);
        }

        const config: ProxyConfiguration = {
            // https://docs.sentry.io/api/organizations/retrieve-an-organizations-events-count-by-project/
            endpoint: `/0/organizations/${encodeURIComponent(input.organization_id_or_slug)}/stats-summary/`,
            params: queryParts.join('&'),
            retries: 3
        };

        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
