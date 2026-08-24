import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderContactSchema = z.object({
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    // Freshdesk can return phone/mobile as a number rather than the documented string.
    phone: z.union([z.string(), z.number()]).nullable().optional(),
    mobile: z.union([z.string(), z.number()]).nullable().optional(),
    job_title: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    time_zone: z.string().nullable().optional()
});

const ProviderAgentSchema = z.object({
    id: z.number(),
    available: z.boolean().nullable().optional(),
    available_since: z.string().nullable().optional(),
    occasional: z.boolean().nullable().optional(),
    signature: z.string().nullable().optional(),
    ticket_scope: z.number().nullable().optional(),
    type: z.string().nullable().optional(),
    skill_ids: z.array(z.number()).nullable().optional(),
    group_ids: z.array(z.number()).nullable().optional(),
    role_ids: z.array(z.number()).nullable().optional(),
    focus_mode: z.boolean().nullable().optional(),
    // Freshdesk nests contact details (email, name, phone, mobile, job_title, language,
    // time_zone) under `contact` rather than exposing them on the agent object directly.
    contact: ProviderContactSchema.nullable().optional(),
    last_active_at: z.string().nullable().optional(),
    deactivated: z.boolean().nullable().optional(),
    agent_operational_status: z.string().nullable().optional(),
    org_agent_id: z.string().nullable().optional(),
    org_group_ids: z.array(z.number()).nullable().optional(),
    contribution_group_ids: z.array(z.number()).nullable().optional(),
    org_contribution_group_ids: z.array(z.number()).nullable().optional(),
    scope: z.unknown().nullable().optional(),
    availability: z.unknown().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const AgentSchema = z
    .object({
        id: z.string().describe('Unique identifier of the agent.'),
        available: z.boolean().optional().describe('Whether the agent is currently available to accept tickets.'),
        available_since: z.string().optional().describe('ISO 8601 timestamp when the agent became available.'),
        occasional: z.boolean().optional().describe('Whether the agent is an occasional (non-full-time) agent.'),
        signature: z.string().optional().describe('HTML signature appended to ticket replies by the agent.'),
        ticket_scope: z.number().optional().describe('Ticket access scope: 1=Global, 2=Group, 3=Restricted.'),
        type: z.string().optional().describe('Agent type, e.g. support_agent.'),
        skill_ids: z.array(z.number()).optional().describe('IDs of skills assigned to the agent.'),
        group_ids: z.array(z.number()).optional().describe('IDs of groups the agent belongs to.'),
        role_ids: z.array(z.number()).optional().describe('IDs of roles assigned to the agent.'),
        focus_mode: z.boolean().optional().describe('Whether focus mode is enabled for the agent.'),
        contact_name: z.string().optional().describe('Name from the agent contact record.'),
        contact_email: z.string().optional().describe('Email from the agent contact record.'),
        contact_avatar: z.string().optional().describe('Avatar URL from the agent contact record.'),
        last_active_at: z.string().optional().describe('ISO 8601 timestamp when the agent was last active.'),
        deactivated: z.boolean().optional().describe('Whether the agent account is deactivated.'),
        agent_operational_status: z.string().optional().describe('Current operational status of the agent.'),
        org_agent_id: z.string().optional().describe('Organization-level agent identifier.'),
        org_group_ids: z.array(z.number()).optional().describe('Organization-level group IDs for the agent.'),
        contribution_group_ids: z.array(z.number()).optional().describe('Contribution group IDs for the agent.'),
        org_contribution_group_ids: z.array(z.number()).optional().describe('Organization contribution group IDs for the agent.'),
        scope: z.unknown().optional().describe('Ticket scope as a number or detailed object.'),
        availability: z.unknown().optional().describe('Availability details per channel or as an object.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the agent was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the agent was last updated.'),
        email: z.string().optional().describe('Primary email address of the agent.'),
        name: z.string().optional().describe('Display name of the agent.'),
        phone: z.string().optional().describe('Phone number of the agent.'),
        mobile: z.string().optional().describe('Mobile number of the agent.'),
        job_title: z.string().optional().describe('Job title of the agent.'),
        language: z.string().optional().describe('Language code of the agent.'),
        time_zone: z.string().optional().describe('Time zone of the agent.')
    })
    .describe('Freshdesk support agent.');

const sync = createSync({
    description: 'Sync agents from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Agent: AgentSchema
    },

    // Blocker: The /api/v2/agents endpoint does not support updated_since,
    // modified_since, cursor, or since_id parameters. It only supports page
    // and per_page pagination, plus basic filters (email, phone, mobile, state).
    // Delete-tracked syncs must always start from page 1 and complete a full
    // enumeration per Nango requirements, so there is no resumable checkpoint.
    exec: async (nango) => {
        await nango.trackDeletesStart('Agent');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_agents
            endpoint: '/api/v2/agents',
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

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const agents = pageResults.map((record) => {
                const parsed = ProviderAgentSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse agent record: ${parsed.error.message}`);
                }
                const agent = parsed.data;

                return {
                    id: String(agent.id),
                    ...(agent.available != null && { available: agent.available }),
                    ...(agent.available_since != null && { available_since: agent.available_since }),
                    ...(agent.occasional != null && { occasional: agent.occasional }),
                    ...(agent.signature != null && { signature: agent.signature }),
                    ...(agent.ticket_scope != null && { ticket_scope: agent.ticket_scope }),
                    ...(agent.type != null && { type: agent.type }),
                    ...(agent.skill_ids != null && { skill_ids: agent.skill_ids }),
                    ...(agent.group_ids != null && { group_ids: agent.group_ids }),
                    ...(agent.role_ids != null && { role_ids: agent.role_ids }),
                    ...(agent.focus_mode != null && { focus_mode: agent.focus_mode }),
                    ...(agent.contact?.name != null && { contact_name: agent.contact.name }),
                    ...(agent.contact?.email != null && { contact_email: agent.contact.email }),
                    ...(agent.contact?.avatar != null && { contact_avatar: agent.contact.avatar }),
                    ...(agent.last_active_at != null && { last_active_at: agent.last_active_at }),
                    ...(agent.deactivated != null && { deactivated: agent.deactivated }),
                    ...(agent.agent_operational_status != null && { agent_operational_status: agent.agent_operational_status }),
                    ...(agent.org_agent_id != null && { org_agent_id: agent.org_agent_id }),
                    ...(agent.org_group_ids != null && { org_group_ids: agent.org_group_ids }),
                    ...(agent.contribution_group_ids != null && { contribution_group_ids: agent.contribution_group_ids }),
                    ...(agent.org_contribution_group_ids != null && { org_contribution_group_ids: agent.org_contribution_group_ids }),
                    ...(agent.scope != null && { scope: agent.scope }),
                    ...(agent.availability != null && { availability: agent.availability }),
                    ...(agent.created_at != null && { created_at: agent.created_at }),
                    ...(agent.updated_at != null && { updated_at: agent.updated_at }),
                    ...(agent.contact?.email != null && { email: agent.contact.email }),
                    ...(agent.contact?.name != null && { name: agent.contact.name }),
                    ...(agent.contact?.phone != null && { phone: String(agent.contact.phone) }),
                    ...(agent.contact?.mobile != null && { mobile: String(agent.contact.mobile) }),
                    ...(agent.contact?.job_title != null && { job_title: agent.contact.job_title }),
                    ...(agent.contact?.language != null && { language: agent.contact.language }),
                    ...(agent.contact?.time_zone != null && { time_zone: agent.contact.time_zone })
                };
            });

            if (agents.length > 0) {
                await nango.batchSave(agents, 'Agent');
            }
        }

        await nango.trackDeletesEnd('Agent');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
