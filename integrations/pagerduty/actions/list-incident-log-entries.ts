import { z } from 'zod';
import { createAction } from 'nango';

const LogEntrySchema = z
    .object({
        id: z.string().describe('Unique identifier for the log entry.'),
        type: z.string().describe('Log entry type, e.g. annotate_log_entry or resolve_log_entry.'),
        summary: z.string().nullable().optional().describe('A short summary of the log entry.'),
        self: z.string().nullable().optional().describe('The API URL of the log entry.'),
        html_url: z.string().nullable().optional().describe('The PagerDuty web URL of the log entry.'),
        created_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the log entry was created.')
    })
    .passthrough();

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident whose log entries to list.'),
        cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Number of results to return per page.'),
        time_zone: z.string().optional().describe('Time zone used when rendering dates in the response.'),
        since: z.string().optional().describe('Start of a date range filter on log entry created_at. ISO 8601 format.'),
        until: z.string().optional().describe('End of a date range filter on log entry created_at. ISO 8601 format.'),
        is_overview: z.boolean().optional().describe('When true, returns only overview-worthy log entry types.'),
        include: z.array(z.string()).optional().describe('Array of additional resources to include in the response.')
    })
    .describe('Input to list incident log entries.');

const OutputSchema = z
    .object({
        log_entries: z.array(LogEntrySchema).describe('The list of log entries for the incident.'),
        next_offset: z.number().optional().describe('Offset to request the next page. Absent when there are no more pages.')
    })
    .describe('Output containing a page of incident log entries.');

/**
 * @tags: [read]
 * @tagReason: Reads log entries from the provider without modifying any data.
 * @pitfalls: Each log entry type returns a different subset of extra fields; inspect the type before accessing fields like responder, subscriber, message, or channels.
 */
const action = createAction({
    description: 'List the timeline of log entries (state changes) for an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let offset = 0;
        if (input.cursor !== undefined) {
            const parsed = Number(input.cursor);
            if (!/^\d+$/.test(input.cursor) || !Number.isSafeInteger(parsed)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a valid numeric offset string'
                });
            }
            offset = parsed;
        }

        // PagerDuty requires the array-valued `include` filter as repeated bracketed keys,
        // e.g. include[]=channels&include[]=services, and rejects a plain `include` key
        // outright ("Include must be a Array"). ProxyConfiguration.params only accepts
        // string | Record<string, string | number>, so array values can't be passed through
        // the params object (the proxy would collapse them into a single comma-joined
        // value). Build the query string manually instead.
        const searchParams = new URLSearchParams();
        if (offset > 0) {
            searchParams.set('offset', String(offset));
        }
        if (input.limit !== undefined) {
            searchParams.set('limit', String(input.limit));
        }
        if (input.time_zone !== undefined) {
            searchParams.set('time_zone', input.time_zone);
        }
        if (input.since !== undefined) {
            searchParams.set('since', input.since);
        }
        if (input.until !== undefined) {
            searchParams.set('until', input.until);
        }
        if (input.is_overview !== undefined) {
            searchParams.set('is_overview', input.is_overview ? 'true' : 'false');
        }
        if (input.include !== undefined && input.include.length > 0) {
            for (const inc of input.include) {
                searchParams.append('include[]', inc);
            }
        }

        // https://developer.pagerduty.com/api-reference/
        const response = await nango.get({
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/log_entries`,
            params: searchParams.toString(),
            retries: 3
        });

        let rawData: unknown = response.data;
        if (typeof rawData === 'string') {
            // @allowTryCatch: JSON.parse may throw on malformed string responses from the proxy.
            try {
                rawData = JSON.parse(rawData);
            } catch (_e) {
                throw new nango.ActionError({
                    type: 'unexpected_response',
                    message: 'Provider returned a non-JSON string response'
                });
            }
        }

        const envelopeSchema = z.object({
            log_entries: z.array(z.unknown()),
            limit: z.number().optional(),
            offset: z.number().optional(),
            more: z.boolean().optional()
        });

        const parsedEnvelope = envelopeSchema.safeParse(rawData);
        if (!parsedEnvelope.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Provider response did not contain the expected log_entries array'
            });
        }

        const log_entries: z.infer<typeof LogEntrySchema>[] = [];
        for (const entry of parsedEnvelope.data.log_entries) {
            const parsed = LogEntrySchema.safeParse(entry);
            if (parsed.success) {
                log_entries.push(parsed.data);
            }
        }

        let next_offset: number | undefined;
        if (parsedEnvelope.data.more === true && typeof parsedEnvelope.data.offset === 'number' && typeof parsedEnvelope.data.limit === 'number') {
            next_offset = parsedEnvelope.data.offset + parsedEnvelope.data.limit;
        }

        return {
            log_entries,
            ...(next_offset !== undefined && { next_offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
