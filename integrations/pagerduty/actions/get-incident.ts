import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the incident to retrieve.')
    })
    .describe('Input parameters for retrieving a single PagerDuty incident.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the incident.'),
        type: z.string().describe('The type of the object, typically "incident".'),
        summary: z.string().describe('A short summary of the incident.'),
        self: z.string().describe('The API URL of the incident.'),
        html_url: z.string().describe('The URL to view the incident in the PagerDuty web UI.'),
        incident_number: z.number().describe('The incident number, unique within the account.'),
        title: z.string().describe('The title of the incident.'),
        description: z.string().optional().describe('A detailed description of the incident.'),
        status: z.string().describe('The current status of the incident (e.g., triggered, acknowledged, resolved).'),
        created_at: z.string().describe('The timestamp when the incident was created.'),
        updated_at: z.string().describe('The timestamp when the incident was last updated.'),
        last_status_change_at: z.string().optional().describe('The timestamp of the last status change.'),
        resolved_at: z.string().optional().describe('The timestamp when the incident was resolved, if applicable.'),
        incident_key: z.string().optional().describe('The deduplication key for grouping related alerts into a single incident.'),
        urgency: z.string().optional().describe('The urgency level of the incident (high or low).'),
        service: z.record(z.string(), z.unknown()).optional().describe('The service associated with this incident.'),
        priority: z.record(z.string(), z.unknown()).optional().nullable().describe('The priority assigned to the incident.'),
        assignees: z.array(z.record(z.string(), z.unknown())).optional().describe('Users currently assigned to the incident.'),
        acknowledgements: z.array(z.record(z.string(), z.unknown())).optional().describe('Users who have acknowledged the incident.'),
        teams: z.array(z.record(z.string(), z.unknown())).optional().describe('Teams associated with the incident.'),
        escalation_policy: z.record(z.string(), z.unknown()).optional().describe('The escalation policy governing this incident.'),
        last_status_change_by: z.record(z.string(), z.unknown()).optional().describe('The user or service that triggered the last status change.'),
        alert_counts: z.record(z.string(), z.unknown()).optional().describe('Counts of alerts by status within the incident.'),
        body: z.record(z.string(), z.unknown()).optional().describe('Additional incident body details.'),
        conference_bridge: z.record(z.string(), z.unknown()).optional().nullable().describe('Conference bridge details for the incident, if configured.')
    })
    .passthrough()
    .describe('A single PagerDuty incident with its metadata, assignments, and related references.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single incident by ID from the PagerDuty API.
 * @pitfalls: Deleted services or escalation policies may still appear as incident references with null or missing URLs.
 */
const action = createAction({
    description: 'Retrieve a single incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/incidents/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            incident: z.record(z.string(), z.unknown())
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const ProviderIncidentSchema = z
            .object({
                id: z.string(),
                type: z.string(),
                summary: z.string(),
                self: z.string(),
                html_url: z.string(),
                incident_number: z.number(),
                title: z.string(),
                description: z.string().nullish(),
                status: z.string(),
                created_at: z.string(),
                updated_at: z.string(),
                last_status_change_at: z.string().nullish(),
                resolved_at: z.string().nullish(),
                incident_key: z.string().nullish(),
                urgency: z.string().nullish(),
                service: z.record(z.string(), z.unknown()).nullish(),
                priority: z.record(z.string(), z.unknown()).nullish(),
                assignees: z.array(z.record(z.string(), z.unknown())).nullish(),
                acknowledgements: z.array(z.record(z.string(), z.unknown())).nullish(),
                teams: z.array(z.record(z.string(), z.unknown())).nullish(),
                escalation_policy: z.record(z.string(), z.unknown()).nullish(),
                last_status_change_by: z.record(z.string(), z.unknown()).nullish(),
                alert_counts: z.record(z.string(), z.unknown()).nullish(),
                body: z.record(z.string(), z.unknown()).nullish(),
                conference_bridge: z.record(z.string(), z.unknown()).nullish()
            })
            .passthrough();

        const providerIncident = ProviderIncidentSchema.parse(providerData.incident);

        const {
            id,
            type,
            summary,
            self,
            html_url,
            incident_number,
            title,
            description,
            status,
            created_at,
            updated_at,
            last_status_change_at,
            resolved_at,
            incident_key,
            urgency,
            service,
            priority,
            assignees,
            acknowledgements,
            teams,
            escalation_policy,
            last_status_change_by,
            alert_counts,
            body,
            conference_bridge,
            ...rest
        } = providerIncident;

        return {
            id,
            type,
            summary,
            self,
            html_url,
            incident_number,
            title,
            ...(description != null && { description }),
            status,
            created_at,
            updated_at,
            ...(last_status_change_at != null && { last_status_change_at }),
            ...(resolved_at != null && { resolved_at }),
            ...(incident_key != null && { incident_key }),
            ...(urgency != null && { urgency }),
            ...(service != null && { service }),
            ...(priority != null && { priority }),
            ...(assignees != null && { assignees }),
            ...(acknowledgements != null && { acknowledgements }),
            ...(teams != null && { teams }),
            ...(escalation_policy != null && { escalation_policy }),
            ...(last_status_change_by != null && { last_status_change_by }),
            ...(alert_counts != null && { alert_counts }),
            ...(body != null && { body }),
            ...(conference_bridge != null && { conference_bridge }),
            ...rest
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
