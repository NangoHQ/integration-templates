import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSlaTargetPrioritySchema = z.object({
    respond_within: z.number(),
    resolve_within: z.number(),
    business_hours: z.boolean(),
    escalation_enabled: z.boolean()
});

const ProviderEscalationLevelSchema = z.object({
    escalation_time: z.number(),
    agent_ids: z.array(z.number())
});

const ProviderEscalationSchema = z
    .object({
        response: z
            .object({
                escalation_time: z.number(),
                agent_ids: z.array(z.number())
            })
            .optional(),
        resolution: z.record(z.string(), ProviderEscalationLevelSchema).optional()
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

const ProviderSlaPolicySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    active: z.boolean(),
    is_default: z.boolean(),
    position: z.number().optional(),
    sla_target: z.record(z.string(), ProviderSlaTargetPrioritySchema).optional(),
    applicable_to: ProviderApplicableToSchema.optional(),
    escalation: ProviderEscalationSchema.optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const SlaTargetPrioritySchema = z
    .object({
        respond_within: z.number().describe('Target response time in seconds'),
        resolve_within: z.number().describe('Target resolution time in seconds'),
        business_hours: z.boolean().describe('Whether the target is measured in business hours'),
        escalation_enabled: z.boolean().describe('Whether escalation is enabled for this priority level')
    })
    .describe('SLA targets for a single priority level');

const EscalationLevelSchema = z
    .object({
        escalation_time: z.number().describe('Time in seconds after which to escalate'),
        agent_ids: z.array(z.number()).describe('Agent IDs to notify when this escalation level is reached')
    })
    .describe('Configuration for a single escalation level');

const EscalationSchema = z
    .object({
        response: z
            .object({
                escalation_time: z.number().describe('Response escalation time in seconds'),
                agent_ids: z.array(z.number()).describe('Agent IDs to notify for response escalation')
            })
            .optional()
            .describe('Response escalation configuration'),
        resolution: z.record(z.string(), EscalationLevelSchema).optional().describe('Resolution escalation configuration mapped by level name')
    })
    .passthrough()
    .describe('Escalation configuration for SLA breaches');

const ApplicableToSchema = z
    .object({
        company_ids: z.array(z.number()).optional().describe('Company IDs this SLA policy applies to'),
        group_ids: z.array(z.number()).optional().describe('Group IDs this SLA policy applies to'),
        sources: z.array(z.number()).optional().describe('Ticket source IDs this SLA policy applies to'),
        ticket_types: z.array(z.string()).optional().describe('Ticket types this SLA policy applies to'),
        product_ids: z.array(z.number()).optional().describe('Product IDs this SLA policy applies to')
    })
    .passthrough()
    .describe('Conditions that determine which tickets this SLA policy applies to');

const SlaPolicySchema = z
    .object({
        id: z.string().describe('Unique identifier of the SLA policy'),
        name: z.string().describe('Name of the SLA policy'),
        description: z.string().optional().describe('Description of the SLA policy'),
        active: z.boolean().describe('Whether the SLA policy is active'),
        is_default: z.boolean().describe('Whether this is the default SLA policy'),
        position: z.number().optional().describe('Position or order of the SLA policy'),
        sla_target: z.record(z.string(), SlaTargetPrioritySchema).optional().describe('SLA target configuration mapped by priority level'),
        applicable_to: ApplicableToSchema.optional().describe('Conditions that determine which tickets this SLA policy applies to'),
        escalation: EscalationSchema.optional().describe('Escalation configuration for SLA breaches'),
        created_at: z.string().describe('Timestamp when the SLA policy was created'),
        updated_at: z.string().describe('Timestamp when the SLA policy was last updated')
    })
    .describe('An SLA policy that defines response and resolution targets for tickets');

function mapSlaPolicies(pageResults: unknown[]): z.infer<typeof SlaPolicySchema>[] {
    const parsed = z.array(ProviderSlaPolicySchema).safeParse(pageResults);
    if (!parsed.success) {
        throw new Error(`Failed to parse SLA policies: ${parsed.error.message}`);
    }

    return parsed.data.map((record) => ({
        id: String(record.id),
        name: record.name,
        ...(record.description != null && { description: record.description }),
        active: record.active,
        is_default: record.is_default,
        ...(record.position !== undefined && { position: record.position }),
        ...(record.sla_target !== undefined && { sla_target: record.sla_target }),
        ...(record.applicable_to !== undefined && { applicable_to: record.applicable_to }),
        ...(record.escalation !== undefined && { escalation: record.escalation }),
        created_at: record.created_at,
        updated_at: record.updated_at
    }));
}

const sync = createSync({
    description: 'Sync SLA policies from Freshdesk',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        SlaPolicy: SlaPolicySchema
    },

    // Delete-tracked syncs must always start from page 1 and complete a full enumeration
    // per Nango requirements; there is no resumable checkpoint.
    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_sla_policies
            endpoint: '/api/v2/sla_policies',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        const iterator = nango.paginate(proxyConfig);

        // Fetch and validate the first page before opening the delete-tracking window, so a
        // transient empty or invalid response can't wipe out previously-synced records.
        const first = await iterator.next();
        const firstPolicies = first.done ? [] : mapSlaPolicies(first.value);

        await nango.trackDeletesStart('SlaPolicy');

        if (firstPolicies.length > 0) {
            await nango.batchSave(firstPolicies, 'SlaPolicy');
        }

        let next = await iterator.next();
        while (!next.done) {
            const policies = mapSlaPolicies(next.value);
            if (policies.length > 0) {
                await nango.batchSave(policies, 'SlaPolicy');
            }
            next = await iterator.next();
        }

        await nango.trackDeletesEnd('SlaPolicy');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
