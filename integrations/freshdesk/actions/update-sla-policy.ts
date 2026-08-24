import { z } from 'zod';
import { createAction } from 'nango';

const SlaTargetPrioritySchema = z
    .object({
        respond_within: z.number().optional().describe('Response time limit in seconds.'),
        resolve_within: z.number().optional().describe('Resolution time limit in seconds.'),
        business_hours: z.boolean().optional().describe('Whether the SLA timer uses business hours.'),
        escalation_enabled: z.boolean().optional().describe('Whether escalation is enabled for this priority.')
    })
    .passthrough();

const SlaTargetSchema = z
    .object({
        priority_1: SlaTargetPrioritySchema.optional().describe('SLA target for priority 1 (lowest).'),
        priority_2: SlaTargetPrioritySchema.optional().describe('SLA target for priority 2.'),
        priority_3: SlaTargetPrioritySchema.optional().describe('SLA target for priority 3.'),
        priority_4: SlaTargetPrioritySchema.optional().describe('SLA target for priority 4 (highest).')
    })
    .passthrough()
    .describe('SLA target configuration with response and resolution times for each priority level.');

const ApplicableToSchema = z
    .object({
        company_ids: z.array(z.number()).optional().describe('Company IDs the policy applies to.'),
        group_ids: z.array(z.number()).optional().describe('Group IDs the policy applies to.'),
        sources: z.array(z.number()).optional().describe('Ticket source IDs the policy applies to.'),
        ticket_types: z.array(z.string()).optional().describe('Ticket types the policy applies to.'),
        product_ids: z.array(z.number()).optional().describe('Product IDs the policy applies to.')
    })
    .passthrough()
    .describe('Conditions that determine which tickets this SLA policy applies to.');

const EscalationLevelSchema = z
    .object({
        escalation_time: z.number().optional().describe('Time in seconds after which escalation triggers.'),
        agent_ids: z.array(z.number()).optional().describe('Agent IDs to notify on escalation.')
    })
    .passthrough();

const EscalationSchema = z
    .object({
        response: EscalationLevelSchema.optional().describe('Response escalation configuration.'),
        resolution: z
            .object({
                level_1: EscalationLevelSchema.optional().describe('First resolution escalation level.'),
                level_2: EscalationLevelSchema.optional().describe('Second resolution escalation level.'),
                level_3: EscalationLevelSchema.optional().describe('Third resolution escalation level.'),
                level_4: EscalationLevelSchema.optional().describe('Fourth resolution escalation level.')
            })
            .passthrough()
            .optional()
            .describe('Resolution escalation levels.')
    })
    .passthrough()
    .describe('Escalation configuration for SLA breaches.');

const InputSchema = z
    .object({
        id: z.union([z.string(), z.number()]).describe('Unique identifier of the SLA policy to update. Example: "158000321260"'),
        name: z.string().optional().describe('Name of the SLA policy.'),
        description: z.string().optional().describe('Description of the SLA policy.'),
        active: z.boolean().optional().describe('Whether the SLA policy is active.'),
        is_default: z.boolean().optional().describe('Whether this is the default SLA policy.'),
        position: z.number().optional().describe('Position or order of the SLA policy.'),
        sla_target: SlaTargetSchema.optional().describe('SLA target configuration by priority.'),
        applicable_to: ApplicableToSchema.optional().describe('Conditions that determine which tickets the policy applies to.'),
        escalation: EscalationSchema.optional().describe('Escalation configuration for SLA breaches.')
    })
    .describe('Input to update an existing SLA policy.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the SLA policy.'),
        name: z.string().describe('Name of the SLA policy.'),
        description: z.string().optional().describe('Description of the SLA policy.'),
        is_default: z.boolean().describe('Whether this is the default SLA policy.'),
        active: z.boolean().describe('Whether the SLA policy is active.'),
        position: z.number().optional().describe('Position or order of the SLA policy.'),
        sla_target: SlaTargetSchema.optional().describe('SLA target configuration by priority.'),
        applicable_to: ApplicableToSchema.optional().describe('Conditions that determine which tickets the policy applies to.'),
        escalation: EscalationSchema.optional().describe('Escalation configuration for SLA breaches.'),
        created_at: z.string().describe('Timestamp when the SLA policy was created.'),
        updated_at: z.string().describe('Timestamp when the SLA policy was last updated.')
    })
    .describe('The updated SLA policy.');

const ProviderSlaTargetPrioritySchema = z
    .object({
        respond_within: z.number().optional(),
        resolve_within: z.number().optional(),
        business_hours: z.boolean().optional(),
        escalation_enabled: z.boolean().optional()
    })
    .passthrough();

const ProviderSlaTargetSchema = z
    .object({
        priority_1: ProviderSlaTargetPrioritySchema.optional(),
        priority_2: ProviderSlaTargetPrioritySchema.optional(),
        priority_3: ProviderSlaTargetPrioritySchema.optional(),
        priority_4: ProviderSlaTargetPrioritySchema.optional()
    })
    .passthrough();

const ProviderApplicableToSchema = z
    .object({
        company_ids: z.array(z.number()).optional(),
        group_ids: z.array(z.number()).optional(),
        sources: z.array(z.number()).optional(),
        ticket_types: z.array(z.string()).optional(),
        product_ids: z.array(z.number()).optional()
    })
    .passthrough();

const ProviderEscalationLevelSchema = z
    .object({
        escalation_time: z.number().optional(),
        agent_ids: z.array(z.number()).optional()
    })
    .passthrough();

const ProviderEscalationSchema = z
    .object({
        response: ProviderEscalationLevelSchema.optional(),
        resolution: z
            .object({
                level_1: ProviderEscalationLevelSchema.optional(),
                level_2: ProviderEscalationLevelSchema.optional(),
                level_3: ProviderEscalationLevelSchema.optional(),
                level_4: ProviderEscalationLevelSchema.optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const ProviderSlaPolicySchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    description: z.string().nullable().optional(),
    is_default: z.boolean(),
    active: z.boolean(),
    position: z.number().optional(),
    sla_target: ProviderSlaTargetSchema.nullable().optional(),
    applicable_to: ProviderApplicableToSchema.nullable().optional(),
    escalation: ProviderEscalationSchema.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Sends a PUT request to update an SLA policy on the provider.
 * @pitfalls: Freshdesk enforces per-minute rate limits; rapid successive calls can return 429 even when valid.
 */
const action = createAction({
    description: 'Update an SLA policy in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const policyId = typeof input.id === 'number' ? String(input.id) : input.id;

        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_sla_policy
            endpoint: `/api/v2/sla_policies/${encodeURIComponent(policyId)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.active !== undefined && { active: input.active }),
                ...(input.is_default !== undefined && { is_default: input.is_default }),
                ...(input.position !== undefined && { position: input.position }),
                ...(input.sla_target !== undefined && { sla_target: input.sla_target }),
                ...(input.applicable_to !== undefined && { applicable_to: input.applicable_to }),
                ...(input.escalation !== undefined && { escalation: input.escalation })
            },
            retries: 1
        });

        const providerPolicy = ProviderSlaPolicySchema.parse(response.data);

        return {
            id: String(providerPolicy.id),
            name: providerPolicy.name,
            ...(providerPolicy.description != null && { description: providerPolicy.description }),
            is_default: providerPolicy.is_default,
            active: providerPolicy.active,
            ...(providerPolicy.position !== undefined && { position: providerPolicy.position }),
            ...(providerPolicy.sla_target != null && { sla_target: providerPolicy.sla_target }),
            ...(providerPolicy.applicable_to != null && { applicable_to: providerPolicy.applicable_to }),
            ...(providerPolicy.escalation != null && { escalation: providerPolicy.escalation }),
            created_at: providerPolicy.created_at,
            updated_at: providerPolicy.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
