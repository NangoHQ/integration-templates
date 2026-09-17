import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('Incident ID containing the alert. Example: "PT4KHLX"'),
        alert_id: z.string().describe('Alert ID to retrieve. Example: "PT4KHLK"')
    })
    .describe('Input for retrieving a single alert on a PagerDuty incident.');

const ReferenceSchema = z
    .object({
        id: z.string().describe('The unique identifier of the referenced object.'),
        summary: z.string().optional().describe('A short-form, server-generated string providing succinct information about the object.'),
        type: z.string().describe('A string that determines the schema of the object.'),
        self: z.string().optional().describe('The API show URL at which the object is accessible.'),
        html_url: z.string().optional().describe('A URL at which the entity is uniquely displayed in the Web app.')
    })
    .passthrough();

const ServiceReferenceSchema = ReferenceSchema.extend({
    type: z.literal('service_reference').describe('The type of object being referenced.')
});

const IncidentReferenceSchema = ReferenceSchema.extend({
    type: z.literal('incident_reference').describe('The type of object being referenced.')
});

const IntegrationReferenceSchema = ReferenceSchema.extend({
    type: z.string().describe('The type of integration being referenced.')
});

const LogEntryReferenceSchema = ReferenceSchema.extend({
    type: z.string().describe('The type of log entry being referenced.')
});

const ContextSchema = z
    .object({
        type: z.enum(['link', 'image']).describe('The type of context being attached to the incident.'),
        href: z.string().optional().describe('The link target URL.'),
        src: z.string().optional().describe('The image source URL.'),
        text: z.string().optional().describe('The alternate display text for an image.')
    })
    .passthrough();

const BodySchema = z
    .object({
        type: z.literal('alert_body').describe('The type of the alert body.'),
        contexts: z.array(ContextSchema).optional().describe('Contexts to be included with the body such as links to graphs or images.'),
        details: z
            .union([z.record(z.string(), z.unknown()), z.string()])
            .optional()
            .describe('An arbitrary JSON object or string containing any data explaining the nature of the alert.')
    })
    .passthrough();

const AlertSchema = z
    .object({
        id: z.string().describe('The unique identifier of the alert.'),
        type: z.literal('alert').describe('The type of object being returned.'),
        summary: z.string().optional().describe('A short-form, server-generated string providing succinct information about the alert.'),
        self: z.string().optional().describe('The API show URL at which the alert is accessible.'),
        html_url: z.string().optional().describe('A URL at which the alert is uniquely displayed in the Web app.'),
        created_at: z.string().describe('The date/time the alert was first triggered.'),
        resolved_at: z.string().optional().describe('The date/time the alert was resolved.'),
        status: z.enum(['triggered', 'resolved']).describe('The current status of the alert.'),
        alert_key: z.string().describe('The alert de-duplication key.'),
        service: ServiceReferenceSchema.optional().describe('The service associated with the alert.'),
        first_trigger_log_entry: LogEntryReferenceSchema.optional().describe('The log entry recording when the alert was first triggered.'),
        incident: IncidentReferenceSchema.optional().describe('The incident associated with the alert.'),
        suppressed: z.boolean().optional().describe('Whether or not the alert is suppressed.'),
        severity: z.enum(['info', 'warning', 'error', 'critical']).optional().describe('The magnitude of the problem as reported by the monitoring tool.'),
        integration: IntegrationReferenceSchema.optional().describe('The integration that created the alert.'),
        body: BodySchema.optional().describe('A JSON object containing data describing the alert.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        alert: AlertSchema.describe('The retrieved alert object.')
    })
    .passthrough()
    .describe('Output containing the retrieved alert.');

const ProviderReferenceSchema = z
    .object({
        id: z.string(),
        summary: z.string().nullish(),
        type: z.string(),
        self: z.string().nullish(),
        html_url: z.string().nullish()
    })
    .passthrough();

const ProviderServiceReferenceSchema = ProviderReferenceSchema.extend({
    type: z.literal('service_reference')
});

const ProviderIncidentReferenceSchema = ProviderReferenceSchema.extend({
    type: z.literal('incident_reference')
});

const ProviderIntegrationReferenceSchema = ProviderReferenceSchema.extend({
    type: z.string()
});

const ProviderLogEntryReferenceSchema = ProviderReferenceSchema.extend({
    type: z.string()
});

const ProviderContextSchema = z
    .object({
        type: z.enum(['link', 'image']),
        href: z.string().nullish(),
        src: z.string().nullish(),
        text: z.string().nullish()
    })
    .passthrough();

const ProviderBodySchema = z
    .object({
        type: z.literal('alert_body'),
        contexts: z.array(ProviderContextSchema).nullish(),
        details: z.union([z.record(z.string(), z.unknown()), z.string()]).nullish()
    })
    .passthrough();

const ProviderAlertSchema = z
    .object({
        id: z.string(),
        type: z.literal('alert'),
        summary: z.string().nullish(),
        self: z.string().nullish(),
        html_url: z.string().nullish(),
        created_at: z.string(),
        status: z.enum(['triggered', 'resolved']),
        alert_key: z.string(),
        service: ProviderServiceReferenceSchema.nullish(),
        first_trigger_log_entry: ProviderLogEntryReferenceSchema.nullish(),
        incident: ProviderIncidentReferenceSchema.nullish(),
        suppressed: z.boolean().nullish(),
        severity: z.enum(['info', 'warning', 'error', 'critical']).nullish(),
        integration: ProviderIntegrationReferenceSchema.nullish(),
        body: ProviderBodySchema.nullish()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        alert: ProviderAlertSchema
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

/**
 * @tags: [read]
 * @tagReason: Retrieves a single alert from an incident.
 * @pitfalls: Alerts are only generated by the Events API v2 or a monitoring integration; incidents created via POST /incidents contain no alerts.
 */
const action = createAction({
    description: 'Retrieve a single alert on an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/592e890ae8c99-get-an-alert
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/alerts/${encodeURIComponent(input.alert_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Alert not found',
                incident_id: input.incident_id,
                alert_id: input.alert_id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const stripped = stripNulls(providerResponse);
        const result = OutputSchema.parse(stripped);
        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
