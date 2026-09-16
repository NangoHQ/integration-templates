import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The unique identifier of the incident to snooze.'),
        duration: z
            .number()
            .int()
            .min(1)
            .max(604800)
            .describe('The number of seconds to snooze the incident for. After this period the incident will return to the triggered state.'),
        from: z
            .string()
            .email()
            .optional()
            .describe('The email address of the user performing the snooze action. If omitted, the current connection user email is fetched automatically.')
    })
    .describe('Input for snoozing a PagerDuty incident.');

const ProviderIncidentSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string(),
        status: z.string(),
        self: z.string().optional(),
        html_url: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the snoozed incident.'),
        type: z.string().describe('The PagerDuty resource type. Example: "incident".'),
        summary: z.string().describe('A brief summary of the incident.'),
        status: z.string().describe('The current status of the incident after snoozing.'),
        self: z.string().optional().describe('The API URL of the incident.'),
        html_url: z.string().optional().describe('The web URL of the incident in the PagerDuty UI.')
    })
    .describe('Output containing the snoozed PagerDuty incident.');

/**
 * @tags: [write]
 * @tagReason: Mutates the incident state by snoozing it for a specified duration.
 * @pitfalls: The incident must already be acknowledged before it can be snoozed; calling this action on a triggered incident returns HTTP 400.
 */
const action = createAction({
    description: 'Snooze an incident for a given duration (re-triggers it later if not resolved).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let fromEmail = input.from;
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

        // https://developer.pagerduty.com/api-reference/4c0934f83db89-snooze-an-incident
        const response = await nango.post({
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/snooze`,
            data: {
                duration: input.duration
            },
            headers: {
                From: fromEmail
            },
            retries: 3
        });

        const providerIncident = ProviderIncidentSchema.parse(response.data.incident);

        return {
            id: providerIncident.id,
            type: providerIncident.type,
            summary: providerIncident.summary,
            status: providerIncident.status,
            ...(providerIncident.self !== undefined && { self: providerIncident.self }),
            ...(providerIncident.html_url !== undefined && { html_url: providerIncident.html_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
