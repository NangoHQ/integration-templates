import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// --- Internal provider schemas (no descriptions required) ---

const PagerDutyReferenceSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string().optional(),
        self: z.string().optional(),
        html_url: z.string().optional()
    })
    .passthrough();

const PagerDutyIntegrationSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        summary: z.string().optional(),
        self: z.string().optional(),
        html_url: z.string().optional()
    })
    .passthrough();

const PagerDutyIncidentUrgencyRuleSchema = z
    .object({
        type: z.string(),
        urgency: z.string().optional(),
        during_support_hours: z
            .object({
                type: z.string(),
                urgency: z.string()
            })
            .optional(),
        outside_support_hours: z
            .object({
                type: z.string(),
                urgency: z.string()
            })
            .optional()
    })
    .passthrough();

const PagerDutyServiceSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        status: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        escalation_policy: PagerDutyReferenceSchema.nullable().optional(),
        integrations: z.array(PagerDutyIntegrationSchema).optional(),
        type: z.string().optional(),
        summary: z.string().optional(),
        self: z.string().optional(),
        html_url: z.string().optional(),
        incident_urgency_rule: PagerDutyIncidentUrgencyRuleSchema.nullable().optional(),
        support_hours: z.unknown().nullable().optional(),
        scheduled_actions: z.array(z.unknown()).optional(),
        auto_resolve_timeout: z.number().nullable().optional(),
        acknowledgement_timeout: z.number().nullable().optional(),
        alert_grouping: z.string().nullable().optional(),
        alert_grouping_timeout: z.number().nullable().optional(),
        alert_creation: z.string().optional(),
        alert_grouping_parameters: z.unknown().nullable().optional(),
        service_url: z.string().nullable().optional(),
        severity_filter: z.string().nullable().optional()
    })
    .passthrough();

// --- Public model schemas (descriptions required on every root schema and field) ---

const EscalationPolicyReferenceSchema = z
    .object({
        id: z.string().describe('The unique identifier of the escalation policy assigned to this service.'),
        type: z.string().describe('The PagerDuty resource type of the escalation policy reference.'),
        summary: z.string().optional().describe('A short summary of the escalation policy.'),
        self: z.string().optional().describe('The API URL of the escalation policy resource.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the escalation policy.')
    })
    .describe('A reference to the escalation policy assigned to a service for incident routing.');

const IntegrationReferenceSchema = z
    .object({
        id: z.string().describe('The unique identifier of the integration configured on this service.'),
        type: z.string().describe('The PagerDuty resource type of the integration reference.'),
        summary: z.string().optional().describe('A short summary of the integration.'),
        self: z.string().optional().describe('The API URL of the integration resource.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the integration.')
    })
    .describe('A reference to an integration configured on a PagerDuty service, such as a monitoring tool or webhook.');

const IncidentUrgencyRuleSchema = z
    .object({
        type: z.string().describe('The type of incident urgency rule (e.g., constant, use_support_hours).'),
        urgency: z.string().optional().describe('The urgency level when the rule applies (high or low).'),
        during_support_hours: z
            .object({
                type: z.string().describe('The type of urgency rule during support hours.'),
                urgency: z.string().describe('The urgency level during support hours.')
            })
            .optional()
            .describe('The urgency rule applied during support hours.'),
        outside_support_hours: z
            .object({
                type: z.string().describe('The type of urgency rule outside support hours.'),
                urgency: z.string().describe('The urgency level outside support hours.')
            })
            .optional()
            .describe('The urgency rule applied outside support hours.')
    })
    .describe('The urgency rule governing how incidents created for a service are prioritized.');

const ServiceSchema = z
    .object({
        id: z.string().describe('The unique identifier of the service.'),
        name: z.string().describe('The name of the service.'),
        description: z.string().optional().describe('A description of the service.'),
        status: z.string().describe('The current status of the service (e.g., active, warning, critical, maintenance, disabled).'),
        created_at: z.string().describe('The ISO 8601 timestamp when the service was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the service was last updated.'),
        escalation_policy: EscalationPolicyReferenceSchema.optional().describe('The escalation policy assigned to this service for incident routing.'),
        integrations: z
            .array(IntegrationReferenceSchema)
            .optional()
            .describe('The integrations configured on this service, such as monitoring tools or webhooks.'),
        type: z.string().optional().describe('The PagerDuty resource type of the service.'),
        summary: z.string().optional().describe('A short summary of the service.'),
        self: z.string().optional().describe('The API URL of the service resource.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the service.'),
        incident_urgency_rule: IncidentUrgencyRuleSchema.optional().describe(
            'The urgency rule governing how incidents created for this service are prioritized.'
        ),
        support_hours: z.unknown().optional().describe('The support hours configuration for the service, if any.'),
        scheduled_actions: z.array(z.unknown()).optional().describe('Scheduled actions that can change urgency or other settings at specific times.'),
        auto_resolve_timeout: z
            .number()
            .optional()
            .describe('The number of seconds after which incidents on this service are automatically resolved, if configured.'),
        acknowledgement_timeout: z.number().optional().describe('The number of seconds after which unacknowledged incidents are escalated, if configured.'),
        alert_grouping: z.string().optional().describe('The alert grouping mode configured for this service.'),
        alert_grouping_timeout: z.number().optional().describe('The timeout in seconds for alert grouping on this service.'),
        alert_creation: z.string().optional().describe('The alert creation behavior for this service (e.g., create_alerts_and_incidents).'),
        alert_grouping_parameters: z.unknown().optional().describe('Additional parameters for advanced alert grouping configuration.'),
        service_url: z.string().optional().describe('A custom URL associated with this service, if configured.'),
        severity_filter: z.string().optional().describe('The severity filter applied to this service, if configured.')
    })
    .describe('A PagerDuty service that represents an application, component, or other entity that may generate incidents.');

const CheckpointSchema = z.object({
    offset: z.number().int()
});

type Service = z.infer<typeof ServiceSchema>;
type EscalationPolicyReference = z.infer<typeof EscalationPolicyReferenceSchema>;
type IntegrationReference = z.infer<typeof IntegrationReferenceSchema>;
type IncidentUrgencyRule = z.infer<typeof IncidentUrgencyRuleSchema>;

const sync = createSync({
    description: "Sync PagerDuty services, including each service's embedded escalation-policy reference and integrations array.",
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['services.read'],
    checkpoint: CheckpointSchema,
    models: {
        Service: ServiceSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? undefined : CheckpointSchema.parse(rawCheckpoint);
        const startOffset = checkpoint?.offset ?? 0;
        let nextOffset: number | undefined = startOffset;

        // Blocker: PagerDuty GET /services has no changed-since or modified-after filter.
        // Pagination is offset/limit-based, so this remains a full refresh that resumes
        // from the saved offset after an interrupted run.
        await nango.trackDeletesStart('Service');

        // ProxyConfiguration.params only accepts a string or Record<string, string | number> -
        // arrays are not a valid param value even though PagerDuty expects repeated
        // include[]=... query entries. offset-type pagination also mutates `params` in place
        // on every page to inject offset/limit, which requires `params` to stay a plain object,
        // so the two include[] values are appended to the endpoint's query string directly
        // (constant across pages) to embed the escalation-policy and integration details this
        // sync's description promises, leaving `params` free for the paginator's own offset/limit.
        const includeParams = new URLSearchParams();
        includeParams.append('include[]', 'escalation_policies');
        includeParams.append('include[]', 'integrations');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/services?${includeParams.toString()}`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: startOffset,
                limit_name_in_request: 'limit',
                response_path: 'services',
                limit: 25,
                offset_calculation_method: 'per-page',
                on_page: async ({ nextPageParam }) => {
                    nextOffset = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const services: Service[] = [];

            for (const raw of page) {
                const parsed = PagerDutyServiceSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse service: ${parsed.error.message}`);
                }

                const record = parsed.data;

                const mapped: Service = {
                    id: record.id,
                    name: record.name,
                    status: record.status,
                    created_at: record.created_at,
                    updated_at: record.updated_at
                };

                if (record.description != null) {
                    mapped.description = record.description;
                }

                if (record.escalation_policy != null) {
                    const ep = record.escalation_policy;
                    const mappedEp: EscalationPolicyReference = {
                        id: ep.id,
                        type: ep.type
                    };
                    if (ep.summary != null) {
                        mappedEp.summary = ep.summary;
                    }
                    if (ep.self != null) {
                        mappedEp.self = ep.self;
                    }
                    if (ep.html_url != null) {
                        mappedEp.html_url = ep.html_url;
                    }
                    mapped.escalation_policy = mappedEp;
                }

                if (record.integrations != null) {
                    mapped.integrations = record.integrations.map((integration) => {
                        const mappedIntegration: IntegrationReference = {
                            id: integration.id,
                            type: integration.type
                        };
                        if (integration.summary != null) {
                            mappedIntegration.summary = integration.summary;
                        }
                        if (integration.self != null) {
                            mappedIntegration.self = integration.self;
                        }
                        if (integration.html_url != null) {
                            mappedIntegration.html_url = integration.html_url;
                        }
                        return mappedIntegration;
                    });
                }

                if (record.type != null) {
                    mapped.type = record.type;
                }

                if (record.summary != null) {
                    mapped.summary = record.summary;
                }

                if (record.self != null) {
                    mapped.self = record.self;
                }

                if (record.html_url != null) {
                    mapped.html_url = record.html_url;
                }

                if (record.incident_urgency_rule != null) {
                    const rule = record.incident_urgency_rule;
                    const mappedRule: IncidentUrgencyRule = {
                        type: rule.type
                    };
                    if (rule.urgency != null) {
                        mappedRule.urgency = rule.urgency;
                    }
                    if (rule.during_support_hours != null) {
                        mappedRule.during_support_hours = {
                            type: rule.during_support_hours.type,
                            urgency: rule.during_support_hours.urgency
                        };
                    }
                    if (rule.outside_support_hours != null) {
                        mappedRule.outside_support_hours = {
                            type: rule.outside_support_hours.type,
                            urgency: rule.outside_support_hours.urgency
                        };
                    }
                    mapped.incident_urgency_rule = mappedRule;
                }

                if (record.support_hours != null) {
                    mapped.support_hours = record.support_hours;
                }

                if (record.scheduled_actions != null) {
                    mapped.scheduled_actions = record.scheduled_actions;
                }

                if (record.auto_resolve_timeout != null) {
                    mapped.auto_resolve_timeout = record.auto_resolve_timeout;
                }

                if (record.acknowledgement_timeout != null) {
                    mapped.acknowledgement_timeout = record.acknowledgement_timeout;
                }

                if (record.alert_grouping != null) {
                    mapped.alert_grouping = record.alert_grouping;
                }

                if (record.alert_grouping_timeout != null) {
                    mapped.alert_grouping_timeout = record.alert_grouping_timeout;
                }

                if (record.alert_creation != null) {
                    mapped.alert_creation = record.alert_creation;
                }

                if (record.alert_grouping_parameters != null) {
                    mapped.alert_grouping_parameters = record.alert_grouping_parameters;
                }

                if (record.service_url != null) {
                    mapped.service_url = record.service_url;
                }

                if (record.severity_filter != null) {
                    mapped.severity_filter = record.severity_filter;
                }

                services.push(mapped);
            }

            if (services.length > 0) {
                await nango.batchSave(services, 'Service');
            }

            if (nextOffset !== undefined) {
                await nango.saveCheckpoint({ offset: nextOffset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Service');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
