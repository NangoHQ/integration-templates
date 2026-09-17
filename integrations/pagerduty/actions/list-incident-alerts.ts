import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident to list alerts for. Example: "PT4KHLK"'),
        cursor: z.string().optional().describe('Pagination cursor representing the offset. Omit for the first page.'),
        limit: z.number().optional().describe('The number of results per page.'),
        total: z.boolean().optional().describe('Set to true to populate the total field in the response. Defaults to false for faster response times.'),
        statuses: z
            .array(z.enum(['triggered', 'resolved']))
            .optional()
            .describe('Return only alerts with the given statuses.'),
        alert_key: z.string().optional().describe('Alert de-duplication key to filter by.'),
        include: z
            .array(z.enum(['services', 'first_trigger_log_entries', 'incidents']))
            .optional()
            .describe('Array of additional details to include in the response.'),
        sort_by: z.string().optional().describe('Sort field and direction, e.g. "created_at:desc" or "resolved_at:asc".')
    })
    .describe('Input parameters for listing alerts attached to a PagerDuty incident.');

const ReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the referenced resource.'),
    type: z.string().describe('The type of the referenced resource.'),
    summary: z.string().optional().describe('A short-form summary of the referenced resource.'),
    self: z.string().optional().describe('The API show URL at which the referenced resource is accessible.'),
    html_url: z.string().optional().describe('A URL at which the referenced resource is displayed in the PagerDuty web app.')
});

const AlertSchema = z.object({
    id: z.string().describe('The unique identifier of the alert.'),
    type: z.string().describe('The type of object. Always "alert".'),
    summary: z.string().optional().describe('A short-form summary of the alert.'),
    self: z.string().optional().describe('The API show URL at which the alert is accessible.'),
    html_url: z.string().optional().describe('A URL at which the alert is displayed in the PagerDuty web app.'),
    created_at: z.string().describe('The date/time the alert was first triggered. Example: "2015-10-06T21:30:42Z"'),
    status: z.enum(['triggered', 'resolved']).describe('The current status of the alert.'),
    alert_key: z.string().describe("The alert's de-duplication key."),
    service: ReferenceSchema.optional().describe('The service this alert belongs to.'),
    first_trigger_log_entry: ReferenceSchema.optional().describe('The log entry representing the first trigger of this alert.'),
    incident: ReferenceSchema.optional().describe('The incident this alert belongs to.'),
    suppressed: z.boolean().optional().describe('Whether or not the alert is suppressed.'),
    severity: z.enum(['info', 'warning', 'error', 'critical']).optional().describe('The magnitude of the problem as reported by the monitoring tool.'),
    integration: ReferenceSchema.optional().describe('The integration that created this alert.'),
    body: z
        .object({
            type: z.string().optional().describe('The type of the body. Always "alert_body".'),
            contexts: z.array(z.unknown()).optional().describe('Contexts to be included with the body such as links to graphs or images.'),
            details: z.unknown().optional().describe('An arbitrary JSON object or string containing data explaining the nature of the alert.')
        })
        .optional()
        .describe('A JSON object containing data describing the alert.')
});

// PagerDuty can legitimately send explicit `null` (not just omit the field) for
// optional/reference fields such as service, first_trigger_log_entry, incident,
// integration, body, suppressed, and severity. AlertSchema above only allows
// `undefined` for these (via `.optional()`), so parsing directly against it throws
// on a `null`. Parse against this nullable "provider" schema first, then normalize
// nulls into the strict output shape below. Mirrors the pattern in get-incident-alert.ts.
const ProviderReferenceSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string().nullish(),
        self: z.string().nullish(),
        html_url: z.string().nullish()
    })
    .passthrough();

const ProviderAlertSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string().nullish(),
        self: z.string().nullish(),
        html_url: z.string().nullish(),
        created_at: z.string(),
        status: z.enum(['triggered', 'resolved']),
        alert_key: z.string(),
        service: ProviderReferenceSchema.nullish(),
        first_trigger_log_entry: ProviderReferenceSchema.nullish(),
        incident: ProviderReferenceSchema.nullish(),
        suppressed: z.boolean().nullish(),
        severity: z.enum(['info', 'warning', 'error', 'critical']).nullish(),
        integration: ProviderReferenceSchema.nullish(),
        body: z
            .object({
                type: z.string().nullish(),
                contexts: z.array(z.unknown()).nullish(),
                details: z.unknown().nullish()
            })
            .nullish()
    })
    .passthrough();

function stripNulls(value: unknown): unknown {
    if (value === null) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(stripNulls).filter((v): v is unknown => v !== undefined);
    }
    if (typeof value === 'object' && value !== undefined) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            const stripped = stripNulls(val);
            if (stripped !== undefined) {
                result[key] = stripped;
            }
        }
        return result;
    }
    return value;
}

const OutputSchema = z
    .object({
        alerts: z.array(AlertSchema).describe('The list of alerts attached to the incident.'),
        limit: z.number().describe('The number of results per page in this response.'),
        offset: z.number().describe('The offset of the current page.'),
        more: z.boolean().describe('Whether there are more results available on additional pages.'),
        total: z.number().nullable().describe('The total number of results. Null unless total=true was requested.'),
        next_cursor: z.string().optional().describe('Cursor to pass to the next page request. Omitted when there are no more pages.')
    })
    .describe('Output containing the paginated list of alerts attached to a PagerDuty incident.');

/**
 * @tags: [read]
 * @tagReason: Reads alerts attached to an incident from the PagerDuty API.
 * @pitfalls: Alerts are generated exclusively by the Events API or monitoring integrations, so incidents created via the REST API or UI typically return an empty alert list.
 */
const action = createAction({
    description: 'List the alerts attached to an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor !== undefined ? Number(input.cursor) : 0;
        if (input.cursor !== undefined && (!/^\d+$/.test(input.cursor) || !Number.isSafeInteger(offset))) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer string'
            });
        }

        // PagerDuty requires array-valued filters as repeated bracketed keys, e.g.
        // statuses[]=triggered&statuses[]=resolved. ProxyConfiguration.params only accepts
        // string | Record<string, string | number>, so array values can't be passed through
        // the params object directly (the proxy would collapse them into a single
        // comma-joined value, which PagerDuty rejects). Build the query string manually.
        const searchParams = new URLSearchParams();
        if (input.limit !== undefined) {
            searchParams.set('limit', String(input.limit));
        }
        searchParams.set('offset', String(offset));
        if (input.total !== undefined) {
            searchParams.set('total', String(input.total));
        }
        if (input.statuses !== undefined && input.statuses.length > 0) {
            for (const status of input.statuses) {
                searchParams.append('statuses[]', status);
            }
        }
        if (input.alert_key !== undefined) {
            searchParams.set('alert_key', input.alert_key);
        }
        if (input.include !== undefined && input.include.length > 0) {
            for (const inc of input.include) {
                searchParams.append('include[]', inc);
            }
        }
        if (input.sort_by !== undefined) {
            searchParams.set('sort_by', input.sort_by);
        }

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/7e2620d8f92e6-list-alerts-for-an-incident
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/alerts`,
            params: searchParams.toString(),
            retries: 3
        });

        const ListResponseSchema = z.object({
            alerts: z.array(z.unknown()),
            limit: z.number(),
            offset: z.number(),
            more: z.boolean(),
            total: z.number().nullable()
        });

        const parsed = ListResponseSchema.parse(response.data);
        const alerts = parsed.alerts.map((alert: unknown) => {
            const providerAlert = ProviderAlertSchema.parse(alert);
            const stripped = stripNulls(providerAlert);
            return AlertSchema.parse(stripped);
        });

        return {
            alerts,
            limit: parsed.limit,
            offset: parsed.offset,
            more: parsed.more,
            total: parsed.total,
            ...(parsed.more && { next_cursor: String(parsed.offset + parsed.limit) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
