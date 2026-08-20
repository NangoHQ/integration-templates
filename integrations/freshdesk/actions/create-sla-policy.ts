import { z } from 'zod';
import { createAction } from 'nango';

const SlaPriorityInputSchema = z.object({
    respond_within: z.number().describe('Time in seconds to respond. Must be a multiple of 60 and greater than 900.'),
    resolve_within: z.number().describe('Time in seconds to resolve. Must be a multiple of 60 and greater than 900.'),
    business_hours: z.boolean().describe('Whether business hours should be used for this target.'),
    escalation_enabled: z.boolean().describe('Whether escalation is enabled for this priority.')
});

const ApplicableToInputSchema = z.object({
    company_ids: z.array(z.number()).optional().describe('List of company IDs this policy applies to.'),
    group_ids: z.array(z.number()).optional().describe('List of group IDs this policy applies to.'),
    sources: z.array(z.number()).optional().describe('List of ticket source IDs this policy applies to.'),
    source_infos: z.array(z.number()).optional().describe('List of source info IDs this policy applies to.'),
    ticket_types: z.array(z.string()).optional().describe('List of ticket types this policy applies to.'),
    product_ids: z.array(z.number()).optional().describe('List of product IDs this policy applies to.')
});

const ResponseEscalationInputSchema = z.object({
    escalation_time: z.number().describe('Time in seconds after which to escalate. Must be a multiple of 60 and greater than 900.'),
    agent_ids: z.array(z.number()).describe('List of agent IDs to escalate to.')
});

const ResolutionLevelInputSchema = z.object({
    escalation_time: z.number().describe('Time in seconds after which to escalate. Must be a multiple of 60 and greater than 900.'),
    agent_ids: z.array(z.number()).describe('List of agent IDs to escalate to.')
});

const EscalationInputSchema = z.object({
    response: ResponseEscalationInputSchema.optional().describe('Response escalation configuration.'),
    resolution: z
        .object({
            level_1: ResolutionLevelInputSchema.optional().describe('First-level resolution escalation.'),
            level_2: ResolutionLevelInputSchema.optional().describe('Second-level resolution escalation. Requires level_1.'),
            level_3: ResolutionLevelInputSchema.optional().describe('Third-level resolution escalation. Requires level_2 and level_1.'),
            level_4: ResolutionLevelInputSchema.optional().describe('Fourth-level resolution escalation. Requires level_3, level_2 and level_1.')
        })
        .optional()
        .describe('Resolution escalation configuration with up to four levels.')
});

const InputSchema = z
    .object({
        name: z.string().describe('Name of the SLA policy.'),
        description: z.string().optional().describe('Description of the SLA policy.'),
        active: z.boolean().optional().describe('Whether the SLA policy is active.'),
        is_default: z.boolean().optional().describe('Whether this is the default SLA policy.'),
        position: z.number().optional().describe('Order/position of the SLA policy among all policies.'),
        sla_target: z
            .object({
                priority_1: SlaPriorityInputSchema.describe('SLA target for low priority tickets.'),
                priority_2: SlaPriorityInputSchema.describe('SLA target for medium priority tickets.'),
                priority_3: SlaPriorityInputSchema.describe('SLA target for high priority tickets.'),
                priority_4: SlaPriorityInputSchema.describe('SLA target for urgent priority tickets.')
            })
            .describe('SLA target configuration for each ticket priority.'),
        applicable_to: ApplicableToInputSchema.describe('Conditions that determine which tickets this policy applies to. At least one field is required.'),
        escalation: EscalationInputSchema.optional().describe('Escalation configuration for response and resolution breaches.')
    })
    .describe('Input to create an SLA policy in Freshdesk.');

const SlaPriorityOutputSchema = z.object({
    respond_within: z.number().describe('Time in seconds to respond.'),
    resolve_within: z.number().describe('Time in seconds to resolve.'),
    business_hours: z.boolean().describe('Whether business hours are used for this target.'),
    escalation_enabled: z.boolean().describe('Whether escalation is enabled for this priority.')
});

const ApplicableToOutputSchema = z.object({
    company_ids: z.array(z.number()).optional().describe('List of company IDs this policy applies to.'),
    group_ids: z.array(z.number()).optional().describe('List of group IDs this policy applies to.'),
    sources: z.array(z.number()).optional().describe('List of ticket source IDs this policy applies to.'),
    source_infos: z.array(z.number()).optional().describe('List of source info IDs this policy applies to.'),
    ticket_types: z.array(z.string()).optional().describe('List of ticket types this policy applies to.'),
    product_ids: z.array(z.number()).optional().describe('List of product IDs this policy applies to.')
});

const ResponseEscalationOutputSchema = z.object({
    escalation_time: z.number().optional().describe('Time in seconds after which to escalate.'),
    agent_ids: z.array(z.number()).optional().describe('List of agent IDs to escalate to.')
});

const ResolutionLevelOutputSchema = z.object({
    escalation_time: z.number().optional().describe('Time in seconds after which to escalate.'),
    agent_ids: z.array(z.number()).optional().describe('List of agent IDs to escalate to.')
});

const EscalationOutputSchema = z.object({
    response: ResponseEscalationOutputSchema.optional().describe('Response escalation configuration.'),
    resolution: z
        .object({
            level_1: ResolutionLevelOutputSchema.optional().describe('First-level resolution escalation.'),
            level_2: ResolutionLevelOutputSchema.optional().describe('Second-level resolution escalation.'),
            level_3: ResolutionLevelOutputSchema.optional().describe('Third-level resolution escalation.'),
            level_4: ResolutionLevelOutputSchema.optional().describe('Fourth-level resolution escalation.')
        })
        .optional()
        .describe('Resolution escalation configuration with up to four levels.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created SLA policy.'),
        name: z.string().describe('Name of the SLA policy.'),
        description: z.string().optional().describe('Description of the SLA policy.'),
        active: z.boolean().describe('Whether the SLA policy is active.'),
        is_default: z.boolean().describe('Whether this is the default SLA policy.'),
        position: z.number().describe('Order/position of the SLA policy.'),
        sla_target: z
            .object({
                priority_1: SlaPriorityOutputSchema.describe('SLA target for low priority tickets.'),
                priority_2: SlaPriorityOutputSchema.describe('SLA target for medium priority tickets.'),
                priority_3: SlaPriorityOutputSchema.describe('SLA target for high priority tickets.'),
                priority_4: SlaPriorityOutputSchema.describe('SLA target for urgent priority tickets.')
            })
            .describe('SLA target configuration for each ticket priority.'),
        applicable_to: ApplicableToOutputSchema.describe('Conditions that determine which tickets this policy applies to.'),
        escalation: EscalationOutputSchema.optional().describe('Escalation configuration for response and resolution breaches.'),
        created_at: z.string().describe('Timestamp when the SLA policy was created. Example: "2018-10-04T13:18:54Z".'),
        updated_at: z.string().describe('Timestamp when the SLA policy was last updated. Example: "2019-02-13T12:22:51Z".')
    })
    .describe('The created SLA policy returned by Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new SLA policy in the Freshdesk account.
 * @pitfalls: Only admin agents can create SLA policies; duplicate policy names are rejected with a 400 error.
 */
const action = createAction({
    description: 'Create an SLA policy in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_sla_policy
            endpoint: '/api/v2/sla_policies',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.active !== undefined && { active: input.active }),
                ...(input.is_default !== undefined && { is_default: input.is_default }),
                ...(input.position !== undefined && { position: input.position }),
                sla_target: input.sla_target,
                applicable_to: input.applicable_to,
                ...(input.escalation !== undefined && { escalation: input.escalation })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                id: z.number(),
                name: z.string(),
                description: z.string().optional().nullable(),
                active: z.boolean(),
                is_default: z.boolean(),
                position: z.number(),
                sla_target: z.object({
                    priority_1: SlaPriorityOutputSchema,
                    priority_2: SlaPriorityOutputSchema,
                    priority_3: SlaPriorityOutputSchema,
                    priority_4: SlaPriorityOutputSchema
                }),
                applicable_to: z.object({
                    company_ids: z.array(z.number()).optional(),
                    group_ids: z.array(z.number()).optional(),
                    sources: z.array(z.number()).optional(),
                    source_infos: z.array(z.number()).optional(),
                    ticket_types: z.array(z.string()).optional(),
                    product_ids: z.array(z.number()).optional()
                }),
                escalation: z
                    .object({
                        response: z
                            .object({
                                escalation_time: z.number().optional(),
                                agent_ids: z.array(z.number()).optional()
                            })
                            .optional(),
                        resolution: z
                            .object({
                                level_1: z
                                    .object({
                                        escalation_time: z.number().optional(),
                                        agent_ids: z.array(z.number()).optional()
                                    })
                                    .optional(),
                                level_2: z
                                    .object({
                                        escalation_time: z.number().optional(),
                                        agent_ids: z.array(z.number()).optional()
                                    })
                                    .optional(),
                                level_3: z
                                    .object({
                                        escalation_time: z.number().optional(),
                                        agent_ids: z.array(z.number()).optional()
                                    })
                                    .optional(),
                                level_4: z
                                    .object({
                                        escalation_time: z.number().optional(),
                                        agent_ids: z.array(z.number()).optional()
                                    })
                                    .optional()
                            })
                            .optional()
                    })
                    .optional()
                    .nullable(),
                created_at: z.string(),
                updated_at: z.string()
            })
            .parse(response.data);

        return {
            id: providerResponse.id,
            name: providerResponse.name,
            ...(providerResponse.description != null && { description: providerResponse.description }),
            active: providerResponse.active,
            is_default: providerResponse.is_default,
            position: providerResponse.position,
            sla_target: providerResponse.sla_target,
            applicable_to: providerResponse.applicable_to,
            ...(providerResponse.escalation != null && { escalation: providerResponse.escalation }),
            created_at: providerResponse.created_at,
            updated_at: providerResponse.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
