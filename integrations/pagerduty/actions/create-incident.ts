import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        title: z.string().describe('The title of the incident.'),
        service_id: z.string().describe('The ID of the PagerDuty service to associate the incident with. Example: "PG8A1ZJ"'),
        urgency: z.enum(['high', 'low']).optional().describe('The urgency of the incident. Either "high" or "low".'),
        body: z.string().optional().describe('Additional details or description for the incident body.'),
        from_email: z
            .string()
            .email()
            .optional()
            .describe('The email address of the user creating the incident. If omitted, the current connection user email is fetched automatically.'),
        incident_key: z
            .string()
            .optional()
            .describe(
                'A de-duplication key for the incident. If an open incident already exists with this key, PagerDuty merges into it instead of creating a duplicate. Strongly recommended so retries of this action are idempotent.'
            )
    })
    .describe('Input to create a new PagerDuty incident against a service.');

const ProviderServiceSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional()
});

const ProviderIncidentSchema = z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    status: z.string(),
    urgency: z.string(),
    service: ProviderServiceSchema,
    html_url: z.string().optional(),
    created_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    incident: ProviderIncidentSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created incident.'),
        title: z.string().describe('The title of the incident.'),
        status: z.string().describe('The current status of the incident, such as "triggered".'),
        urgency: z.string().describe('The urgency level of the incident.'),
        service_id: z.string().describe('The ID of the service the incident is associated with.'),
        html_url: z.string().optional().describe('The URL to view the incident in PagerDuty.')
    })
    .describe('Output of a newly created PagerDuty incident.');

/**
 * @tags: [write]
 * @tagReason: Creates a new incident in PagerDuty via the REST API.
 * @pitfalls: Creating an incident is a live operational event that immediately triggers the service's escalation policy and may page or notify on-call responders.
 */
const action = createAction({
    description: 'Create a new incident against a service.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let fromEmail = input.from_email;
        if (!fromEmail) {
            const userConfig: ProxyConfiguration = {
                // https://developer.pagerduty.com/api-reference/e8b6f95f7030f-get-current-user
                endpoint: '/users/me',
                retries: 3
            };
            const userResponse = await nango.get(userConfig);
            const userData = z
                .object({
                    user: z.object({
                        email: z.string()
                    })
                })
                .parse(userResponse.data);
            fromEmail = userData.user.email;
        }

        const createConfig: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/368ae3d685c4e-create-an-incident
            endpoint: '/incidents',
            headers: {
                From: fromEmail
            },
            data: {
                incident: {
                    type: 'incident',
                    title: input.title,
                    service: {
                        id: input.service_id,
                        type: 'service_reference'
                    },
                    ...(input.urgency !== undefined && { urgency: input.urgency }),
                    ...(input.body !== undefined && {
                        body: {
                            type: 'incident_body',
                            details: input.body
                        }
                    }),
                    ...(input.incident_key !== undefined && { incident_key: input.incident_key })
                }
            },
            retries: 3
        };

        const response = await nango.post(createConfig);
        const providerResponse = ProviderResponseSchema.parse(response.data);
        const incident = providerResponse.incident;

        return {
            id: incident.id,
            title: incident.title,
            status: incident.status,
            urgency: incident.urgency,
            service_id: incident.service.id,
            ...(incident.html_url !== undefined && { html_url: incident.html_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
