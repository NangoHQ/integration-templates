import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('The name of the service.'),
        description: z.string().optional().describe('A description of the service.'),
        escalation_policy_id: z.string().describe('The ID of the escalation policy to assign to the service.'),
        alert_creation: z.string().optional().describe('How alerts are created for this service. Example: "create_alerts_and_incidents" or "create_incidents".')
    })
    .describe('Input parameters for creating a PagerDuty service.');

const ProviderEscalationPolicySchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional()
});

const ProviderServiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    status: z.string(),
    type: z.string(),
    html_url: z.string().optional(),
    created_at: z.string().optional(),
    escalation_policy: ProviderEscalationPolicySchema.nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created service.'),
        name: z.string().describe('The name of the service.'),
        description: z.string().optional().describe('The description of the service.'),
        status: z.string().describe('The current status of the service.'),
        escalation_policy_id: z.string().optional().describe('The ID of the assigned escalation policy.'),
        html_url: z.string().optional().describe('The URL to view the service in the PagerDuty web UI.'),
        created_at: z.string().optional().describe('The ISO 8601 timestamp when the service was created.')
    })
    .describe('The created PagerDuty service.');

/**
 * @tags: [write]
 * @tagReason: Creates a new PagerDuty service via POST /services.
 * @pitfalls: Service names must be unique within the account; a duplicate name returns a 400 error.
 */
const action = createAction({
    description: 'Create a service under an escalation policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            service: {
                type: 'service',
                name: input.name,
                escalation_policy: {
                    id: input.escalation_policy_id,
                    type: 'escalation_policy_reference'
                },
                ...(input.description !== undefined && { description: input.description }),
                ...(input.alert_creation !== undefined && { alert_creation: input.alert_creation })
            }
        };

        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/165ad4c02bf2d-create-a-service
            endpoint: '/services',
            data: payload,
            retries: 3
        });

        const service = ProviderServiceSchema.parse(response.data?.service);

        return {
            id: service.id,
            name: service.name,
            ...(service.description != null && { description: service.description }),
            status: service.status,
            ...(service.escalation_policy != null && { escalation_policy_id: service.escalation_policy.id }),
            ...(service.html_url != null && { html_url: service.html_url }),
            ...(service.created_at != null && { created_at: service.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
