import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        destinationIncidentId: z.string().describe('The ID of the destination incident to merge source incidents into.'),
        sourceIncidentIds: z
            .array(z.string().describe('The ID of a source incident to merge into the destination.'))
            .describe('Array of incident IDs to merge into the destination incident.'),
        from: z.string().describe('The email address of the user performing the merge, sent as the PagerDuty From header.')
    })
    .describe('Input to merge source incidents into a destination incident.');

const ProviderIncidentSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string().optional(),
        self: z.string().optional(),
        html_url: z.string().optional(),
        incident_number: z.number().optional(),
        title: z.string().optional(),
        status: z.string().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        service: z
            .object({
                id: z.string(),
                type: z.string(),
                summary: z.string().optional(),
                self: z.string().optional(),
                html_url: z.string().optional()
            })
            .optional(),
        urgency: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('The incident ID.'),
        type: z.string().describe('The incident type.'),
        summary: z.string().optional().describe('A summary of the incident.'),
        self: z.string().optional().describe('The API URL of the incident.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the incident.'),
        incident_number: z.number().optional().describe('The human-readable incident number.'),
        title: z.string().optional().describe('The incident title.'),
        status: z.string().optional().describe('The current status of the incident.'),
        created_at: z.string().optional().describe('When the incident was created.'),
        updated_at: z.string().optional().describe('When the incident was last updated.'),
        service: z
            .object({
                id: z.string().describe('The service ID.'),
                type: z.string().describe('The service type.'),
                summary: z.string().optional().describe('A summary of the service.'),
                self: z.string().optional().describe('The API URL of the service.'),
                html_url: z.string().optional().describe('The PagerDuty web URL of the service.')
            })
            .optional()
            .describe('The service associated with the incident.'),
        urgency: z.string().optional().describe('The urgency of the incident.')
    })
    .describe('The destination incident after merging source incidents into it.');

/**
 * @tags: [write, destructive]
 * @tagReason: Merges source incidents into a destination incident, permanently altering the source incidents' state and resolving them. This operation cannot be reversed.
 * @pitfalls: The server rejects the request with a 400 error if the destination incident is already resolved or if the merge would push its total alerts above 1000.
 */
const action = createAction({
    description: 'Merge one or more source incidents into a destination incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.pagerduty.com/api-reference/7aa2c463eb0e8-merge-incidents
            endpoint: `/incidents/${encodeURIComponent(input.destinationIncidentId)}/merge`,
            data: {
                source_incidents: input.sourceIncidentIds.map((id) => ({
                    id,
                    type: 'incident_reference'
                }))
            },
            headers: {
                From: input.from
            },
            retries: 3
        });

        const providerIncident = ProviderIncidentSchema.parse(response.data.incident);

        return {
            id: providerIncident.id,
            type: providerIncident.type,
            ...(providerIncident.summary !== undefined && { summary: providerIncident.summary }),
            ...(providerIncident.self !== undefined && { self: providerIncident.self }),
            ...(providerIncident.html_url !== undefined && { html_url: providerIncident.html_url }),
            ...(providerIncident.incident_number !== undefined && { incident_number: providerIncident.incident_number }),
            ...(providerIncident.title !== undefined && { title: providerIncident.title }),
            ...(providerIncident.status !== undefined && { status: providerIncident.status }),
            ...(providerIncident.created_at !== undefined && { created_at: providerIncident.created_at }),
            ...(providerIncident.updated_at !== undefined && { updated_at: providerIncident.updated_at }),
            ...(providerIncident.service !== undefined && { service: providerIncident.service }),
            ...(providerIncident.urgency !== undefined && { urgency: providerIncident.urgency })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
