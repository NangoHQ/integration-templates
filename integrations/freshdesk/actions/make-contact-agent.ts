import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        contact_id: z.number().describe('The ID of the contact to convert into an agent. Example: 432'),
        occasional: z.boolean().optional().describe('Set to true if this is an occasional agent (true => occasional, false => full-time).'),
        signature: z.string().optional().describe('Signature of the agent in HTML format.'),
        ticket_scope: z.number().optional().describe('Ticket permission of the agent (1 -> Global Access, 2 -> Group Access, 3 -> Restricted Access).'),
        skill_ids: z.array(z.number()).optional().describe('Skill IDs associated with the agent.'),
        group_ids: z.array(z.number()).optional().describe('Group IDs associated with the agent.'),
        contribution_group_ids: z.array(z.number()).optional().describe('IDs of groups that the agent has view-only access to, if the ticket_scope is 2.'),
        role_ids: z.array(z.number()).optional().describe('Role IDs associated with the agent. At least one role should be associated with the agent.'),
        type: z.string().optional().describe('Type of agent (support_agent -> Support Agent, field_agent -> Field Agent, collaborator -> Collaborator).'),
        focus_mode: z.boolean().optional().describe('Focus mode of the agent. Default value is true.')
    })
    .describe('Input for converting a Freshdesk contact into an agent.');

const AgentSchema = z.object({
    available_since: z.string().nullable().optional().describe('Timestamp when the agent became available.'),
    available: z.boolean().describe('Whether the agent is currently available.'),
    occasional: z.boolean().describe('Whether the agent is an occasional agent.'),
    signature: z.string().nullable().optional().describe('Agent signature in HTML format.'),
    group_ids: z.array(z.number()).optional().describe('Group IDs associated with the agent.'),
    type: z.string().optional().describe('Type of agent (support_agent, field_agent, collaborator).'),
    role_ids: z.array(z.number()).optional().describe('Role IDs associated with the agent.'),
    id: z.number().describe('Agent ID.'),
    ticket_scope: z.number().describe('Ticket permission scope (1 -> Global, 2 -> Group, 3 -> Restricted).'),
    created_at: z.string().describe('Timestamp when the agent was created.'),
    updated_at: z.string().describe('Timestamp when the agent was last updated.'),
    focus_mode: z.boolean().optional().describe('Whether focus mode is enabled for the agent.')
});

const OutputSchema = z
    .object({
        active: z.boolean().describe('Whether the contact is active.'),
        email: z.string().describe('Primary email address of the contact.'),
        job_title: z.string().nullable().optional().describe('Job title of the contact.'),
        language: z.string().optional().describe('Language preference of the contact.'),
        last_login_at: z.string().nullable().optional().describe('Timestamp of the last login.'),
        mobile: z.string().nullable().optional().describe('Mobile phone number of the contact.'),
        name: z.string().describe('Display name of the contact.'),
        phone: z.string().nullable().optional().describe('Phone number of the contact.'),
        time_zone: z.string().optional().describe('Time zone of the contact.'),
        created_at: z.string().describe('Timestamp when the contact was created.'),
        updated_at: z.string().describe('Timestamp when the contact was last updated.'),
        agent: AgentSchema.describe('Agent-specific metadata created after converting the contact.')
    })
    .describe('Output representing the contact after it has been converted into an agent.');

/**
 * @tags: [write, destructive]
 * @tagReason: Converts a contact into an agent, which mutates the contact's role and creates agent-specific metadata. The contact's other_emails are deleted during conversion, and reversing the change requires deleting the agent.
 * @pitfalls: The contact must have an email address or the conversion fails. The contact's other_emails are permanently deleted during conversion. Omitting all optional fields defaults to a full-time support agent with global ticket scope. The account must not have reached its agent limit or the API returns 403.
 */
const action = createAction({
    description: 'Convert a Freshdesk contact into an agent.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.freshdesk.com/api/#make_agent
            endpoint: `/api/v2/contacts/${encodeURIComponent(String(input.contact_id))}/make_agent`,
            data: {
                ...(input.occasional !== undefined && { occasional: input.occasional }),
                ...(input.signature !== undefined && { signature: input.signature }),
                ...(input.ticket_scope !== undefined && { ticket_scope: input.ticket_scope }),
                ...(input.skill_ids !== undefined && { skill_ids: input.skill_ids }),
                ...(input.group_ids !== undefined && { group_ids: input.group_ids }),
                ...(input.contribution_group_ids !== undefined && { contribution_group_ids: input.contribution_group_ids }),
                ...(input.role_ids !== undefined && { role_ids: input.role_ids }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.focus_mode !== undefined && { focus_mode: input.focus_mode })
            },
            retries: 1
        });

        const output = OutputSchema.parse(response.data);
        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
