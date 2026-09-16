import { z } from 'zod';
import { createAction } from 'nango';

const AlertUpdateIncidentReferenceInputSchema = z.object({
    id: z.string().describe('The ID of the target incident to associate the alert with.'),
    type: z.literal('incident_reference').describe('The type of object being referenced. Must be "incident_reference".')
});

const AlertUpdateInputSchema = z.object({
    id: z.string().describe('The unique identifier of the alert to update.'),
    type: z.enum(['alert_reference', 'alert']).describe('The type of object being updated. Use "alert_reference" when referencing an existing alert.'),
    status: z.enum(['resolved', 'triggered']).optional().describe('The desired status of the alert. "resolved" to manage/unmanage, "triggered" to re-trigger.'),
    incident: AlertUpdateIncidentReferenceInputSchema.optional().describe('The incident to associate the alert with, if moving the alert between incidents.')
});

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident whose alerts should be updated.'),
        alerts: z
            .array(AlertUpdateInputSchema)
            .describe('An array of alerts to update, including the parameters to change for each alert. Maximum 250 alerts per request.'),
        limit: z.number().optional().describe('The number of results per page in the response.'),
        offset: z.number().optional().describe('Offset to start pagination search results.'),
        total: z.boolean().optional().describe('Set to true to populate the total field in the pagination response.')
    })
    .describe('Input for bulk updating incident alerts.');

const AlertBodySchema = z.object({
    type: z.literal('alert_body').optional().describe('The type of the alert body.'),
    contexts: z.array(z.unknown()).optional().describe('Contexts to be included with the body such as links to graphs or images.'),
    details: z.unknown().optional().describe('An arbitrary JSON object or string containing any data explaining the nature of the alert.')
});

const ServiceReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the service.'),
    type: z.string().describe('The type of object being referenced.'),
    summary: z.string().optional().describe('A short summary of the service.'),
    self: z.string().optional().describe('The API resource URL of the service.'),
    html_url: z.string().optional().describe('The URL at which the entity is uniquely displayed in the PagerDuty web app.')
});

const LogEntryReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the log entry.'),
    type: z.string().describe('The type of object being referenced.'),
    summary: z.string().optional().describe('A short summary of the log entry.'),
    self: z.string().optional().describe('The API resource URL of the log entry.'),
    html_url: z.string().optional().describe('The URL at which the entity is uniquely displayed in the PagerDuty web app.')
});

const IncidentReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the incident.'),
    type: z.string().describe('The type of object being referenced.'),
    summary: z.string().optional().describe('A short summary of the incident.'),
    self: z.string().optional().describe('The API resource URL of the incident.'),
    html_url: z.string().optional().describe('The URL at which the entity is uniquely displayed in the PagerDuty web app.')
});

const IntegrationReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the integration.'),
    type: z.string().describe('The type of object being referenced.'),
    summary: z.string().optional().describe('A short summary of the integration.'),
    self: z.string().optional().describe('The API resource URL of the integration.'),
    html_url: z.string().optional().describe('The URL at which the entity is uniquely displayed in the PagerDuty web app.')
});

const AlertSchema = z.object({
    id: z.string().describe('The unique identifier of the alert.'),
    type: z.literal('alert').describe('The type of object. Always "alert".'),
    summary: z.string().optional().describe('A short summary of the alert.'),
    self: z.string().optional().describe('The API resource URL of the alert.'),
    html_url: z.string().optional().describe('The URL at which the entity is uniquely displayed in the PagerDuty web app.'),
    status: z.enum(['triggered', 'resolved']).optional().describe('The current status of the alert.'),
    alert_key: z.string().optional().describe("The alert's de-duplication key."),
    created_at: z.string().optional().describe('The date/time the alert was first triggered.'),
    service: ServiceReferenceSchema.optional().describe('The service associated with the alert.'),
    first_trigger_log_entry: LogEntryReferenceSchema.optional().describe('The first trigger log entry for the alert.'),
    incident: IncidentReferenceSchema.optional().describe('The incident associated with the alert.'),
    suppressed: z.boolean().optional().describe('Whether or not an alert is suppressed.'),
    severity: z.enum(['info', 'warning', 'error', 'critical']).optional().describe('The magnitude of the problem as reported by the monitoring tool.'),
    integration: IntegrationReferenceSchema.optional().describe('The integration that created the alert.'),
    body: AlertBodySchema.optional().describe('A JSON object containing data describing the alert.')
});

const OutputSchema = z
    .object({
        alerts: z.array(AlertSchema).nullable().optional().describe('The updated alerts.'),
        limit: z.number().optional().describe('The number of results per page echoed from the request.'),
        offset: z.number().optional().describe('The pagination offset echoed from the request.'),
        more: z.boolean().optional().describe('Indicates whether additional records are available.'),
        total: z.number().nullable().optional().describe('The total number of records matching the query, or null unless total=true was requested.')
    })
    .describe('Output from bulk updating incident alerts.');

/**
 * @tags: [write]
 * @tagReason: Updates the status or incident association of multiple alerts in a single provider call.
 * @pitfalls: The entire call fails with HTTP 400 if any alert is already in the target state, such as resolving an already-resolved alert. A maximum of 250 alerts may be updated per request; exceeding this returns HTTP 413.
 */
const action = createAction({
    description: 'Manage or unmanage multiple alerts on an incident in a single call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }
        if (input.total !== undefined) {
            params['total'] = input.total ? 'true' : 'false';
        }

        // https://developer.pagerduty.com/api-reference/YXBpOjI3NDgyNjQ-pager-duty-api-incident-alerts-manage-alert
        const response = await nango.put({
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/alerts`,
            params,
            data: {
                alerts: input.alerts
            },
            headers: {
                From: 'api@nango.dev'
            },
            retries: 3
        });

        const providerResponse = OutputSchema.parse(response.data);
        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
