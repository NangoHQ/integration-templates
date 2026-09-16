import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident that contains the alert.'),
        alert_id: z.string().describe('The ID of the alert to update.'),
        status: z.enum(['resolved', 'triggered']).describe('The desired alert status. Use "resolved" to resolve the alert or "triggered" to re-trigger it.'),
        from: z.string().describe('The email address of the acting user for the required PagerDuty From header.')
    })
    .describe('Input parameters for updating a single incident alert.');

const ProviderAlertSchema = z.object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    summary: z.string().optional(),
    severity: z.string().optional(),
    alert_key: z.string().optional(),
    created_at: z.string().optional(),
    resolved_at: z.string().nullable().optional(),
    html_url: z.string().optional(),
    errors: z.array(z.string()).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the alert.'),
        type: z.string().describe('The object type of the alert.'),
        status: z.string().describe('The current status of the alert.'),
        summary: z.string().optional().describe('A summary describing the alert.'),
        severity: z.string().optional().describe('The severity level of the alert.'),
        alert_key: z.string().optional().describe('The deduplication key for the alert.'),
        created_at: z.string().optional().describe('The ISO 8601 timestamp when the alert was created.'),
        resolved_at: z.string().optional().describe('The ISO 8601 timestamp when the alert was resolved, if applicable.'),
        html_url: z.string().optional().describe('The URL to view the alert in the PagerDuty web UI.')
    })
    .describe('The updated incident alert returned by PagerDuty.');

/**
 * @tags: [write]
 * @tagReason: Updates the status of an existing alert via a PUT request to PagerDuty.
 * @pitfalls: PagerDuty returns HTTP 200 with embedded error messages such as "Alert Already Resolved" or "Invalid Status Provided" for invalid status transitions.
 */
const action = createAction({
    description: 'Manage or unmanage (resolve/trigger) a single alert on an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/alerts/${encodeURIComponent(input.alert_id)}`,
            headers: {
                From: input.from
            },
            data: {
                alert: {
                    type: 'alert',
                    status: input.status
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('alert' in response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'PagerDuty did not return an alert object.'
            });
        }

        const providerAlert = ProviderAlertSchema.parse(response.data.alert);

        if (providerAlert.errors && providerAlert.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerAlert.errors.join(', '),
                errors: providerAlert.errors
            });
        }

        return {
            id: providerAlert.id,
            type: providerAlert.type,
            status: providerAlert.status,
            ...(providerAlert.summary !== undefined && { summary: providerAlert.summary }),
            ...(providerAlert.severity !== undefined && { severity: providerAlert.severity }),
            ...(providerAlert.alert_key !== undefined && { alert_key: providerAlert.alert_key }),
            ...(providerAlert.created_at !== undefined && { created_at: providerAlert.created_at }),
            ...(providerAlert.resolved_at != null && { resolved_at: providerAlert.resolved_at }),
            ...(providerAlert.html_url !== undefined && { html_url: providerAlert.html_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
