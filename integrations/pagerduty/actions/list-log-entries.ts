import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to the PagerDuty offset. Omit for the first page.'),
        limit: z.number().optional().describe('Number of log entries to return per page. Maximum and default is 100.'),
        since: z.string().optional().describe('ISO 8601 timestamp. Only log entries with created_at equal or after this time are returned.'),
        until: z.string().optional().describe('ISO 8601 timestamp. Only log entries with created_at equal or before this time are returned.'),
        time_zone: z.string().optional().describe('Time zone in which dates in the result will be rendered.'),
        is_overview: z.boolean().optional().describe('If true, only log entries of type trigger, acknowledge, resolve, or assign will be returned.'),
        total: z.boolean().optional().describe('If true, the total field in the response will be populated. Defaults to false for faster response times.'),
        include: z
            .array(z.string())
            .optional()
            .describe('Additional resources to include in the response. Valid values include users, services, channels, incident, and teams.'),
        team_ids: z.array(z.string()).optional().describe('An array of team IDs. Only log entries for incidents associated with these teams will be returned.')
    })
    .describe('Input parameters for listing PagerDuty log entries across the account.');

const ReferenceSchema = z
    .object({
        id: z.string().describe('The unique identifier for the referenced entity.'),
        type: z.string().describe('The type of the referenced entity.'),
        summary: z.string().nullable().optional().describe('A brief text summary of the referenced entity.'),
        self: z.string().nullable().optional().describe('The API show URL at which the referenced entity is accessible.'),
        html_url: z.string().nullable().optional().describe('An URL at which the referenced entity is uniquely displayed in the Web app.')
    })
    .passthrough();

const LogEntrySchema = z.object({
    id: z.string().describe('The unique identifier for the log entry.'),
    type: z.string().describe('The type of log entry (e.g., resolve_log_entry, acknowledge_log_entry, trigger_log_entry).'),
    summary: z.string().nullable().optional().describe('A brief text summary of the log entry.'),
    self: z.string().nullable().optional().describe('The API show URL at which the log entry is accessible.'),
    html_url: z.string().nullable().optional().describe('An URL at which the log entry is uniquely displayed in the Web app.'),
    created_at: z.string().nullable().optional().describe('The date/time when the log entry was created.'),
    agent: ReferenceSchema.passthrough().optional().describe('The entity that performed the action recorded by this log entry.'),
    channel: z.record(z.string(), z.unknown()).optional().describe('The channel through which the incident was created or modified.'),
    service: ReferenceSchema.optional().describe('The service associated with the incident for this log entry.'),
    incident: ReferenceSchema.optional().describe('The incident associated with this log entry.'),
    teams: z.array(ReferenceSchema).optional().describe('The teams associated with the incident for this log entry.'),
    contexts: z.array(z.record(z.string(), z.unknown())).optional().describe('Additional context objects for the log entry.'),
    acknowledgement_timeout: z.number().nullable().optional().describe('The acknowledgement timeout in seconds, if applicable.')
});

const OutputSchema = z
    .object({
        log_entries: z.array(LogEntrySchema).describe('The list of log entries returned by the query.'),
        limit: z.number().describe('The number of results per page.'),
        offset: z.number().describe('The offset of the current page of results.'),
        total: z.number().nullable().describe('Total number of results if requested with total=true, otherwise null.'),
        more: z.boolean().describe('Whether there are more results beyond the current page.'),
        next_cursor: z.string().optional().describe('Cursor string to fetch the next page. Present when more is true.')
    })
    .describe('Paginated list of PagerDuty log entries returned by the query.');

type Reference = z.infer<typeof ReferenceSchema>;
type LogEntry = z.infer<typeof LogEntrySchema>;

function normalizeReference(ref: Reference): Reference {
    const { summary, self, html_url, ...rest } = ref;
    return {
        ...rest,
        ...(summary != null && { summary }),
        ...(self != null && { self }),
        ...(html_url != null && { html_url })
    };
}

function normalizeLogEntry(entry: LogEntry): LogEntry {
    return {
        id: entry.id,
        type: entry.type,
        ...(entry.summary != null && { summary: entry.summary }),
        ...(entry.self != null && { self: entry.self }),
        ...(entry.html_url != null && { html_url: entry.html_url }),
        ...(entry.created_at != null && { created_at: entry.created_at }),
        ...(entry.agent != null && { agent: normalizeReference(entry.agent) }),
        ...(entry.channel != null && { channel: entry.channel }),
        ...(entry.service != null && { service: normalizeReference(entry.service) }),
        ...(entry.incident != null && { incident: normalizeReference(entry.incident) }),
        ...(entry.teams != null && { teams: entry.teams.map(normalizeReference) }),
        ...(entry.contexts != null && { contexts: entry.contexts }),
        ...(entry.acknowledgement_timeout != null && { acknowledgement_timeout: entry.acknowledgement_timeout })
    };
}

/**
 * @tags: [read]
 * @tagReason: Retrieves the account-wide log entries feed via GET /log_entries.
 * @pitfalls: The since and until parameters bound a query window on created_at, not on when an incident's status changed, so status changes on older incidents may be missed with a narrow time window.
 */
const action = createAction({
    description: 'List the account-wide log entries feed (every incident/alert state-change event across the account).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid cursor format. Must be a numeric offset.'
            });
        }

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: '/log_entries',
            params: {
                limit: input.limit ?? 25,
                offset: offset,
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until }),
                ...(input.time_zone !== undefined && { time_zone: input.time_zone }),
                ...(input.is_overview !== undefined && { is_overview: String(input.is_overview) }),
                ...(input.total !== undefined && { total: String(input.total) }),
                ...(input.include !== undefined && input.include.length > 0 && { include: input.include }),
                ...(input.team_ids !== undefined && input.team_ids.length > 0 && { team_ids: input.team_ids })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            log_entries: z.array(z.record(z.string(), z.unknown())),
            limit: z.number(),
            offset: z.number(),
            total: z.number().nullable(),
            more: z.boolean()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const logEntries = parsed.log_entries.map((entry) => {
            const parsedEntry = LogEntrySchema.parse(entry);
            return normalizeLogEntry(parsedEntry);
        });

        const nextCursor = parsed.more ? String(parsed.offset + parsed.limit) : undefined;

        return {
            log_entries: logEntries,
            limit: parsed.limit,
            offset: parsed.offset,
            total: parsed.total,
            more: parsed.more,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
