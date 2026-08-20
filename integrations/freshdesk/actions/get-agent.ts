import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Freshdesk agent ID. Example: 432')
    })
    .describe('Input to retrieve a single Freshdesk agent');

const ProviderContactSchema = z.object({
    active: z.boolean().nullable(),
    email: z.string().nullable(),
    job_title: z.string().nullable(),
    language: z.string().nullable(),
    last_login_at: z.string().nullable(),
    mobile: z.string().nullable(),
    name: z.string().nullable(),
    phone: z.union([z.string(), z.number()]).nullable(),
    time_zone: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable()
});

const ProviderAgentSchema = z.object({
    available: z.boolean().nullable(),
    available_since: z.string().nullable(),
    id: z.number(),
    occasional: z.boolean().nullable(),
    signature: z.string().nullable(),
    ticket_scope: z.number().nullable(),
    type: z.string().nullable(),
    skill_ids: z.array(z.number()).nullable(),
    group_ids: z.array(z.number()).nullable(),
    role_ids: z.array(z.number()).nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
    contact: ProviderContactSchema.nullable(),
    focus_mode: z.boolean().nullable()
});

const ContactSchema = z.object({
    active: z.boolean().optional().describe('Whether the agent is verified'),
    email: z.string().optional().describe('Email address of the agent'),
    job_title: z.string().optional().describe('Job title of the agent'),
    language: z.string().optional().describe('Language of the agent. Default is "en"'),
    last_login_at: z.string().optional().describe("Timestamp of the agent's last successful login in UTC"),
    mobile: z.string().optional().describe('Mobile number of the agent'),
    name: z.string().optional().describe('Name of the agent'),
    phone: z.union([z.string(), z.number()]).optional().describe('Telephone number of the agent'),
    time_zone: z.string().optional().describe('Time zone of the agent'),
    created_at: z.string().optional().describe('Creation timestamp in UTC'),
    updated_at: z.string().optional().describe('Timestamp of the last update in UTC')
});

const OutputSchema = z
    .object({
        id: z.number().describe('User ID of the agent'),
        available: z.boolean().optional().describe('Whether the agent is accepting new tickets when automatic ticket assignment is enabled'),
        available_since: z.string().optional().describe('Timestamp when the agent became available or unavailable'),
        occasional: z.boolean().optional().describe('True if this is an occasional agent, false if full-time'),
        signature: z.string().optional().describe('Signature of the agent in HTML format'),
        ticket_scope: z.number().optional().describe('Ticket permission of the agent (1 -> Global Access, 2 -> Group Access, 3 -> Restricted Access)'),
        type: z.string().optional().describe('Type of agent (support_agent, field_agent, collaborator)'),
        skill_ids: z.array(z.number()).optional().describe('Skill IDs associated with the agent'),
        group_ids: z.array(z.number()).optional().describe('Group IDs associated with the agent'),
        role_ids: z.array(z.number()).optional().describe('Role IDs associated with the agent'),
        created_at: z.string().optional().describe('Agent creation timestamp in UTC'),
        updated_at: z.string().optional().describe('Agent updated timestamp in UTC'),
        contact: ContactSchema.optional().describe('Contact details of the agent'),
        focus_mode: z.boolean().optional().describe('Focus mode of the agent')
    })
    .describe('A single Freshdesk agent');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single agent by ID without modifying any data.
 * @pitfalls: Requires admin privileges; non-admin callers will receive an access-denied error.
 */
const action = createAction({
    description: 'Retrieve a single agent from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#view_agent
            endpoint: `/api/v2/agents/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Agent not found',
                id: input.id
            });
        }

        const agent = ProviderAgentSchema.parse(response.data);

        const contact = agent.contact;
        const mappedContact = contact
            ? {
                  ...(contact.active != null && { active: contact.active }),
                  ...(contact.email != null && { email: contact.email }),
                  ...(contact.job_title != null && { job_title: contact.job_title }),
                  ...(contact.language != null && { language: contact.language }),
                  ...(contact.last_login_at != null && { last_login_at: contact.last_login_at }),
                  ...(contact.mobile != null && { mobile: contact.mobile }),
                  ...(contact.name != null && { name: contact.name }),
                  ...(contact.phone != null && { phone: contact.phone }),
                  ...(contact.time_zone != null && { time_zone: contact.time_zone }),
                  ...(contact.created_at != null && { created_at: contact.created_at }),
                  ...(contact.updated_at != null && { updated_at: contact.updated_at })
              }
            : undefined;

        return {
            id: agent.id,
            ...(agent.available != null && { available: agent.available }),
            ...(agent.available_since != null && { available_since: agent.available_since }),
            ...(agent.occasional != null && { occasional: agent.occasional }),
            ...(agent.signature != null && { signature: agent.signature }),
            ...(agent.ticket_scope != null && { ticket_scope: agent.ticket_scope }),
            ...(agent.type != null && { type: agent.type }),
            ...(agent.skill_ids != null && { skill_ids: agent.skill_ids }),
            ...(agent.group_ids != null && { group_ids: agent.group_ids }),
            ...(agent.role_ids != null && { role_ids: agent.role_ids }),
            ...(agent.created_at != null && { created_at: agent.created_at }),
            ...(agent.updated_at != null && { updated_at: agent.updated_at }),
            ...(mappedContact !== undefined && { contact: mappedContact }),
            ...(agent.focus_mode != null && { focus_mode: agent.focus_mode })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
