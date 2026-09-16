import { z } from 'zod';
import { createAction } from 'nango';

const AssignmentSchema = z.object({
    assignee_id: z.string().describe('User ID to assign to this incident.')
});

const InputSchema = z
    .object({
        id: z.string().describe('Incident ID to update.'),
        from: z.string().describe('Email address of the user making the request. Required by PagerDuty.'),
        status: z.enum(['triggered', 'acknowledged', 'resolved']).optional().describe('New incident status.'),
        title: z.string().optional().describe('New incident title.'),
        urgency: z.enum(['high', 'low']).optional().describe('New incident urgency.'),
        priority_id: z.string().optional().describe('Priority ID to set on the incident.'),
        escalation_level: z.number().optional().describe('Escalation policy level to escalate to.'),
        assignments: z.array(AssignmentSchema).optional().describe('Users to reassign the incident to. Replaces existing assignees.'),
        body_details: z.string().optional().describe('Updated incident body details.')
    })
    .describe('Input fields for updating a PagerDuty incident.');

const ProviderIncidentSchema = z.object({
    id: z.string(),
    type: z.string(),
    incident_number: z.number(),
    title: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    urgency: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    service: z
        .object({
            id: z.string(),
            type: z.string(),
            summary: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    priority: z
        .object({
            id: z.string(),
            type: z.string(),
            summary: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Incident ID.'),
        incident_number: z.number().describe('Incident number.'),
        title: z.string().optional().describe('Incident title.'),
        status: z.string().optional().describe('Incident status.'),
        urgency: z.string().optional().describe('Incident urgency.'),
        created_at: z.string().optional().describe('ISO 8601 creation timestamp.'),
        updated_at: z.string().optional().describe('ISO 8601 update timestamp.'),
        html_url: z.string().optional().describe('URL to the incident in PagerDuty.'),
        service_id: z.string().optional().describe('Service ID the incident belongs to.'),
        priority_id: z.string().optional().describe('Priority ID assigned to the incident.')
    })
    .describe('Result of updating a PagerDuty incident.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing incident via PUT.
 */
const action = createAction({
    description: 'Update an incident: acknowledge, resolve, reassign, escalate, retitle, or change urgency/priority',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const incidentBody: Record<string, unknown> = {
            type: 'incident_reference'
        };

        if (input.status !== undefined) {
            incidentBody['status'] = input.status;
        }
        if (input.title !== undefined) {
            incidentBody['title'] = input.title;
        }
        if (input.urgency !== undefined) {
            incidentBody['urgency'] = input.urgency;
        }
        if (input.priority_id !== undefined) {
            incidentBody['priority'] = {
                id: input.priority_id,
                type: 'priority_reference'
            };
        }
        if (input.escalation_level !== undefined) {
            incidentBody['escalation_level'] = input.escalation_level;
        }
        if (input.assignments !== undefined) {
            incidentBody['assignments'] = input.assignments.map((a) => ({
                assignee: {
                    id: a.assignee_id,
                    type: 'user_reference'
                }
            }));
        }
        if (input.body_details !== undefined) {
            incidentBody['body'] = {
                type: 'incident_body',
                details: input.body_details
            };
        }

        const response = await nango.put({
            // https://developer.pagerduty.com/api-reference/incidents/update-an-incident
            endpoint: `/incidents/${encodeURIComponent(input.id)}`,
            headers: {
                From: input.from
            },
            data: {
                incident: incidentBody
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Incident not found or update failed',
                incident_id: input.id
            });
        }

        const providerIncident = ProviderIncidentSchema.parse(response.data.incident);

        return {
            id: providerIncident.id,
            incident_number: providerIncident.incident_number,
            ...(providerIncident.title != null && { title: providerIncident.title }),
            ...(providerIncident.status != null && { status: providerIncident.status }),
            ...(providerIncident.urgency != null && { urgency: providerIncident.urgency }),
            ...(providerIncident.created_at != null && { created_at: providerIncident.created_at }),
            ...(providerIncident.updated_at != null && { updated_at: providerIncident.updated_at }),
            ...(providerIncident.html_url != null && { html_url: providerIncident.html_url }),
            ...(providerIncident.service != null && { service_id: providerIncident.service.id }),
            ...(providerIncident.priority != null && { priority_id: providerIncident.priority.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
