import { z } from 'zod';
import { createAction } from 'nango';

const ProviderEscalationPolicySchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional()
});

const ProviderIntegrationSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    service: z.object({ id: z.string(), type: z.string(), summary: z.string().optional() }).optional(),
    html_url: z.string().optional()
});

const ProviderServiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    html_url: z.string(),
    escalation_policy: ProviderEscalationPolicySchema,
    incident_urgency_rule: z.object({ type: z.string(), urgency: z.string() }).optional(),
    acknowledgement_timeout: z.number().nullable().optional(),
    auto_resolve_timeout: z.number().nullable().optional(),
    alert_creation: z.string().optional(),
    alert_grouping: z.string().nullable().optional(),
    alert_grouping_parameters: z
        .object({
            type: z.string().nullable().optional(),
            config: z.unknown().nullable().optional()
        })
        .optional(),
    integrations: z.array(ProviderIntegrationSchema).optional(),
    scheduled_actions: z.array(z.unknown()).optional(),
    support_hours: z.unknown().nullable().optional(),
    teams: z.array(z.object({ id: z.string(), type: z.string(), summary: z.string().optional() })).optional()
});

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the service to update. Example: "PTO1HWH"'),
        name: z.string().optional().describe('The new name for the service.'),
        description: z.string().nullable().optional().describe('A description of the service. Pass null to clear the existing description.'),
        status: z.enum(['active', 'warning', 'critical', 'maintenance', 'disabled']).optional().describe('The status of the service.'),
        escalation_policy_id: z
            .string()
            .optional()
            .describe('The ID of the escalation policy to assign to this service. Reassigning the escalation policy changes the on-call chain.'),
        auto_resolve_timeout: z.number().nullable().optional().describe('The duration in seconds after which an incident auto-resolves. Pass null to clear.'),
        acknowledgement_timeout: z
            .number()
            .nullable()
            .optional()
            .describe('The duration in seconds after which an incident auto-escalates if unacknowledged. Pass null to clear.'),
        alert_creation: z
            .enum(['create_alerts_and_incidents', 'create_incidents', 'create_resources_and_add_alerts'])
            .optional()
            .describe('How alerts are created for this service.'),
        alert_grouping: z
            .enum(['intelligent', 'time', 'content_based'])
            .nullable()
            .optional()
            .describe('The alert grouping mode. Pass null to disable grouping.')
    })
    .describe('Input for updating an existing PagerDuty service.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the updated service.'),
        name: z.string().describe('The name of the service.'),
        description: z.string().optional().describe('The description of the service.'),
        status: z.string().describe('The current status of the service.'),
        html_url: z.string().describe('The URL to the service in the PagerDuty web UI.'),
        created_at: z.string().describe('ISO 8601 timestamp when the service was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the service was last updated.'),
        escalation_policy: z
            .object({
                id: z.string().describe('The ID of the assigned escalation policy.'),
                type: z.string().describe('The type of the escalation policy reference.'),
                summary: z.string().optional().describe('A summary of the escalation policy.')
            })
            .describe('The escalation policy assigned to this service.'),
        incident_urgency_rule: z
            .object({
                type: z.string().describe('The type of incident urgency rule.'),
                urgency: z.string().describe('The urgency level.')
            })
            .optional()
            .describe('The incident urgency rule configuration.'),
        acknowledgement_timeout: z.number().optional().describe('The acknowledgement timeout in seconds.'),
        auto_resolve_timeout: z.number().optional().describe('The auto-resolve timeout in seconds.'),
        alert_creation: z.string().optional().describe('How alerts are created for this service.'),
        alert_grouping: z.string().optional().describe('The alert grouping mode.'),
        alert_grouping_parameters: z
            .object({
                type: z.string().optional().describe('The type of alert grouping parameters.'),
                config: z.unknown().optional().describe('The configuration object for alert grouping.')
            })
            .optional()
            .describe('Parameters controlling how alerts are grouped.'),
        integrations: z
            .array(
                z.object({
                    id: z.string().describe('The integration ID.'),
                    type: z.string().describe('The integration type.'),
                    summary: z.string().optional().describe('A summary of the integration.'),
                    service: z
                        .object({
                            id: z.string().describe('The service ID.'),
                            type: z.string().describe('The reference type.'),
                            summary: z.string().optional().describe('A summary of the service.')
                        })
                        .optional()
                        .describe('The service associated with this integration.'),
                    html_url: z.string().optional().describe('The URL to the integration in the PagerDuty web UI.')
                })
            )
            .optional()
            .describe('The integrations configured on this service.'),
        scheduled_actions: z.array(z.unknown()).optional().describe('Scheduled actions for the service.'),
        teams: z
            .array(
                z.object({
                    id: z.string().describe('The team ID.'),
                    type: z.string().describe('The reference type.'),
                    summary: z.string().optional().describe('A summary of the team.')
                })
            )
            .optional()
            .describe('The teams associated with this service.')
    })
    .describe('Output of an updated PagerDuty service.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing PagerDuty service via PUT /services/{id}.
 */
const action = createAction({
    description: "Update an existing PagerDuty service's fields, including reassigning its escalation policy.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            type: 'service'
        };

        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.status !== undefined) {
            body['status'] = input.status;
        }
        if (input.escalation_policy_id !== undefined) {
            body['escalation_policy'] = {
                id: input.escalation_policy_id,
                type: 'escalation_policy_reference'
            };
        }
        if (input.auto_resolve_timeout !== undefined) {
            body['auto_resolve_timeout'] = input.auto_resolve_timeout;
        }
        if (input.acknowledgement_timeout !== undefined) {
            body['acknowledgement_timeout'] = input.acknowledgement_timeout;
        }
        if (input.alert_creation !== undefined) {
            body['alert_creation'] = input.alert_creation;
        }
        if (input.alert_grouping !== undefined) {
            body['alert_grouping'] = input.alert_grouping;
        }

        // https://developer.pagerduty.com/api-reference/cf95fd0d9d638-update-a-service
        const response = await nango.put({
            endpoint: `/services/${encodeURIComponent(input.id)}`,
            data: {
                service: body
            },
            retries: 3
        });

        const providerService = ProviderServiceSchema.parse(response.data.service);

        return {
            id: providerService.id,
            name: providerService.name,
            ...(providerService.description != null && { description: providerService.description }),
            status: providerService.status,
            html_url: providerService.html_url,
            created_at: providerService.created_at,
            updated_at: providerService.updated_at,
            escalation_policy: {
                id: providerService.escalation_policy.id,
                type: providerService.escalation_policy.type,
                ...(providerService.escalation_policy.summary != null && { summary: providerService.escalation_policy.summary })
            },
            ...(providerService.incident_urgency_rule != null && {
                incident_urgency_rule: providerService.incident_urgency_rule
            }),
            ...(providerService.acknowledgement_timeout != null && {
                acknowledgement_timeout: providerService.acknowledgement_timeout
            }),
            ...(providerService.auto_resolve_timeout != null && {
                auto_resolve_timeout: providerService.auto_resolve_timeout
            }),
            ...(providerService.alert_creation != null && { alert_creation: providerService.alert_creation }),
            ...(providerService.alert_grouping != null && { alert_grouping: providerService.alert_grouping }),
            ...(providerService.alert_grouping_parameters &&
                providerService.alert_grouping_parameters.type != null && {
                    alert_grouping_parameters: {
                        type: providerService.alert_grouping_parameters.type,
                        ...(providerService.alert_grouping_parameters.config != null && {
                            config: providerService.alert_grouping_parameters.config
                        })
                    }
                }),
            ...(providerService.integrations != null && {
                integrations: providerService.integrations.map((integration) => ({
                    id: integration.id,
                    type: integration.type,
                    ...(integration.summary != null && { summary: integration.summary }),
                    ...(integration.service != null && { service: integration.service }),
                    ...(integration.html_url != null && { html_url: integration.html_url })
                }))
            }),
            ...(providerService.scheduled_actions != null && {
                scheduled_actions: providerService.scheduled_actions
            }),
            ...(providerService.teams != null && {
                teams: providerService.teams.map((team) => ({
                    id: team.id,
                    type: team.type,
                    ...(team.summary != null && { summary: team.summary })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
