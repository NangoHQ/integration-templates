import { z } from 'zod';
import { createAction } from 'nango';

const IncidentUpdateSchema = z
    .object({
        id: z.string().describe('Incident ID to update. Example: "Q0YLGGHWAI1DDT"'),
        type: z.literal('incident_reference').describe('Resource subtype — must be incident_reference.'),
        status: z
            .enum(['triggered', 'acknowledged', 'resolved'])
            .optional()
            .describe('New incident status. triggered re-opens a resolved incident; acknowledged or resolved transitions it forward.'),
        assignments: z
            .array(
                z
                    .object({
                        assignee: z
                            .object({
                                id: z.string().describe('User ID to assign the incident to.'),
                                type: z.string().describe('Assignee resource type, e.g. user_reference.')
                            })
                            .describe('An assignment target.')
                    })
                    .optional()
            )
            .optional()
            .describe('Reassignment targets. Replaces existing assignments when provided.'),
        escalation_level: z.number().int().optional().describe('Escalation policy level to jump to. Used for manual escalation.'),
        resolution: z.string().optional().describe('Resolution summary added when status is resolved.')
    })
    .describe('Single incident update payload.');

const InputSchema = z
    .object({
        from_email: z.string().describe('Email address of the acting PagerDuty user. Required by the API as the From header.'),
        incidents: z
            .array(IncidentUpdateSchema)
            .describe('Array of incident updates. All updates are applied atomically — the entire batch succeeds or fails together.')
    })
    .describe('Input for bulk updating multiple PagerDuty incidents.');

const ProviderIncidentSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    status: z.string(),
    self: z.string().optional(),
    html_url: z.string().optional(),
    service: z
        .object({
            id: z.string().optional(),
            summary: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    assignments: z
        .array(
            z
                .object({
                    assignee: z
                        .object({
                            id: z.string().optional(),
                            summary: z.string().optional(),
                            type: z.string().optional()
                        })
                        .optional()
                })
                .optional()
        )
        .optional(),
    acknowledgements: z
        .array(
            z
                .object({
                    at: z.string().optional(),
                    acknowledger: z
                        .object({
                            id: z.string().optional(),
                            summary: z.string().optional(),
                            type: z.string().optional()
                        })
                        .optional()
                })
                .optional()
        )
        .optional()
});

const ProviderResponseSchema = z.object({
    incidents: z.array(ProviderIncidentSchema)
});

const IncidentOutputSchema = z
    .object({
        id: z.string().describe('Incident ID.'),
        type: z.string().describe('Resource type.'),
        summary: z.string().optional().describe('Human-readable summary of the incident.'),
        status: z.string().describe('Current incident status after the update.'),
        self: z.string().optional().describe('API URL of the incident.'),
        html_url: z.string().optional().describe('Web UI URL of the incident.'),
        service: z
            .object({
                id: z.string().optional().describe('Service ID.'),
                summary: z.string().optional().describe('Service summary.'),
                type: z.string().optional().describe('Service resource type.')
            })
            .optional()
            .describe('Service the incident belongs to.'),
        assignments: z
            .array(
                z
                    .object({
                        assignee: z
                            .object({
                                id: z.string().optional().describe('Assignee user ID.'),
                                summary: z.string().optional().describe('Assignee display name.'),
                                type: z.string().optional().describe('Assignee resource type.')
                            })
                            .optional()
                            .describe('Assigned user.')
                    })
                    .optional()
            )
            .optional()
            .describe('Current assignments after the update.'),
        acknowledgements: z
            .array(
                z
                    .object({
                        at: z.string().optional().describe('ISO 8601 timestamp of the acknowledgement.'),
                        acknowledger: z
                            .object({
                                id: z.string().optional().describe('Acknowledger user ID.'),
                                summary: z.string().optional().describe('Acknowledger display name.'),
                                type: z.string().optional().describe('Acknowledger resource type.')
                            })
                            .optional()
                            .describe('User who acknowledged the incident.')
                    })
                    .optional()
            )
            .optional()
            .describe('Acknowledgement history.')
    })
    .describe('Updated incident returned by the provider.');

const OutputSchema = z
    .object({
        incidents: z.array(IncidentOutputSchema).describe('Updated incidents as returned by the provider.')
    })
    .describe('Result of bulk updating multiple PagerDuty incidents.');

/**
 * @tags: [write]
 * @tagReason: Mutates the status, assignment, or escalation level of multiple incidents via a single provider write call.
 */
const action = createAction({
    description: 'Acknowledge, resolve, reassign, or escalate multiple incidents in a single call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const response = await nango.put({
            // https://developer.pagerduty.com/api-reference/incidents/bulk-update-incidents/
            endpoint: '/incidents',
            headers: {
                From: input.from_email
            },
            data: {
                incidents: input.incidents
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            incidents: parsed.incidents.map((incident) => ({
                id: incident.id,
                type: incident.type,
                ...(incident.summary !== undefined && { summary: incident.summary }),
                status: incident.status,
                ...(incident.self !== undefined && { self: incident.self }),
                ...(incident.html_url !== undefined && { html_url: incident.html_url }),
                ...(incident.service !== undefined && { service: incident.service }),
                ...(incident.assignments !== undefined && { assignments: incident.assignments }),
                ...(incident.acknowledgements !== undefined && { acknowledgements: incident.acknowledgements })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
