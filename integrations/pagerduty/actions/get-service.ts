import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the PagerDuty service to retrieve. Example: "PZW5AR6"')
    })
    .describe('Input for retrieving a single PagerDuty service by ID.');

const ProviderEscalationPolicySchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional()
});

const ProviderIntegrationSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    integration_key: z.string().optional()
});

const ProviderServiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    status: z.string(),
    type: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    escalation_policy: ProviderEscalationPolicySchema.nullable().optional(),
    integrations: z.array(ProviderIntegrationSchema).optional()
});

const EscalationPolicyOutputSchema = z.object({
    id: z.string().describe('The escalation policy ID.'),
    type: z.string().describe('The resource type. Example: "escalation_policy_reference".'),
    summary: z.string().optional().describe('A short summary of the escalation policy.')
});

const IntegrationOutputSchema = z.object({
    id: z.string().describe('The integration ID.'),
    type: z.string().describe('The resource type. Example: "event_transformer_api_inbound_integration" or "service_integration".'),
    summary: z.string().optional().describe('A short summary of the integration.'),
    integration_key: z.string().optional().describe('The integration key used for sending events to this service.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the service.'),
        name: z.string().describe('The name of the service.'),
        description: z.string().optional().describe('A description of the service.'),
        status: z.string().describe('The current status of the service. Example: "active", "warning", "critical", "disabled".'),
        type: z.string().describe('The resource type. Example: "service".'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the service was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the service was last updated.'),
        escalation_policy: EscalationPolicyOutputSchema.optional().describe('The escalation policy associated with this service.'),
        integrations: z.array(IntegrationOutputSchema).optional().describe('The integrations configured for this service.')
    })
    .describe('A single PagerDuty service with its embedded escalation policy and integrations.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single PagerDuty service by ID without mutating provider state.
 * @pitfalls: There is no separate list-integrations action; a service's integrations are only available embedded in the service object.
 */
const action = createAction({
    description: 'Retrieve a single service, including its embedded escalation policy and integrations.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/c2NoOTE4MDczNw-get-a-service
            endpoint: `/services/${encodeURIComponent(input.id)}`,
            params: {
                'include[]': ['escalation_policies', 'integrations']
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Service with ID "${input.id}" was not found.`,
                id: input.id
            });
        }

        const providerService = ProviderServiceSchema.parse(response.data.service);

        return {
            id: providerService.id,
            name: providerService.name,
            ...(providerService.description != null && { description: providerService.description }),
            status: providerService.status,
            type: providerService.type,
            ...(providerService.created_at !== undefined && { created_at: providerService.created_at }),
            ...(providerService.updated_at !== undefined && { updated_at: providerService.updated_at }),
            ...(providerService.escalation_policy != null && { escalation_policy: providerService.escalation_policy }),
            ...(providerService.integrations !== undefined && { integrations: providerService.integrations })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
