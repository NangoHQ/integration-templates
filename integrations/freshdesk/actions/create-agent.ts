import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email: z.string().describe('Email address of the agent. Example: "superman@freshdesk.com"'),
        name: z.string().describe('Name of the agent. Example: "Super man"'),
        ticket_scope: z.number().describe('Ticket permission of the agent. 1 = Global Access, 2 = Group Access, 3 = Restricted Access'),
        occasional: z.boolean().optional().describe('Set to true if this is an occasional agent. Defaults to false (full-time)'),
        signature: z.string().optional().describe('Signature of the agent in HTML format'),
        skill_ids: z.array(z.number()).optional().describe('Skill IDs associated with the agent'),
        group_ids: z.array(z.number()).optional().describe('Group IDs associated with the agent'),
        contribution_group_ids: z
            .array(z.number())
            .optional()
            .describe('IDs of groups that the agent has view-only access to, applicable when ticket_scope is 2'),
        role_ids: z.array(z.number()).optional().describe('Role IDs associated with the agent. At least one role should be associated with the agent'),
        agent_type: z.number().optional().describe('Type of agent. 1 = Support Agent, 2 = Field Agent, 3 = Collaborator. Defaults to 1'),
        language: z.string().optional().describe('Language of the agent. Default is "en"'),
        time_zone: z.string().optional().describe('Time zone of the agent. Default is the domain time zone'),
        focus_mode: z.boolean().optional().describe('Focus mode of the agent. Default is true')
    })
    .describe('Input to create a new Freshdesk agent');

const ContactSchema = z.object({
    active: z.boolean().describe('Whether the agent contact is verified'),
    email: z.string().describe('Email address of the agent'),
    job_title: z.string().nullable().optional().describe('Job title of the agent'),
    language: z.string().describe('Language of the agent'),
    last_login_at: z.string().nullable().optional().describe('Timestamp of the last successful login in UTC'),
    mobile: z.string().nullable().optional().describe('Mobile number of the agent'),
    name: z.string().describe('Name of the agent'),
    phone: z.string().nullable().optional().describe('Telephone number of the agent'),
    time_zone: z.string().describe('Time zone of the agent'),
    created_at: z.string().describe('Creation timestamp in UTC'),
    updated_at: z.string().describe('Last update timestamp in UTC')
});

const OutputSchema = z
    .object({
        id: z.number().describe('User ID of the created agent'),
        available: z.boolean().describe('Whether the agent is accepting new tickets via automatic assignment'),
        occasional: z.boolean().describe('Whether this is an occasional agent'),
        ticket_scope: z.number().describe('Ticket permission of the agent. 1 = Global Access, 2 = Group Access, 3 = Restricted Access'),
        signature: z.string().nullable().optional().describe('Signature of the agent in HTML format'),
        group_ids: z.array(z.number()).optional().describe('Group IDs associated with the agent'),
        role_ids: z.array(z.number()).optional().describe('Role IDs associated with the agent'),
        skill_ids: z.array(z.number()).optional().describe('Skill IDs associated with the agent'),
        created_at: z.string().describe('Agent creation timestamp in UTC'),
        updated_at: z.string().describe('Agent last update timestamp in UTC'),
        available_since: z.string().nullable().optional().describe('Timestamp when the agent became available or unavailable'),
        type: z.string().describe('Type of agent. Example: "support_agent", "field_agent", "collaborator"'),
        focus_mode: z.boolean().describe('Focus mode of the agent'),
        contact: ContactSchema.describe('Contact details of the agent')
    })
    .describe('Freshdesk agent created by the action');

/**
 * @tags: [write]
 * @tagReason: Creates a new agent in Freshdesk via POST /api/v2/agents.
 * @pitfalls: Requires admin privileges. Duplicate email returns 409 and agent limit may return 403. Omitting role_ids lets the provider assign a default role, and occasional defaults to true.
 */
const action = createAction({
    description: 'Create a agent in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_agent
            endpoint: '/api/v2/agents',
            data: {
                email: input.email,
                name: input.name,
                ticket_scope: input.ticket_scope,
                ...(input.occasional !== undefined && { occasional: input.occasional }),
                ...(input.signature !== undefined && { signature: input.signature }),
                ...(input.skill_ids !== undefined && { skill_ids: input.skill_ids }),
                ...(input.group_ids !== undefined && { group_ids: input.group_ids }),
                ...(input.contribution_group_ids !== undefined && { contribution_group_ids: input.contribution_group_ids }),
                ...(input.role_ids !== undefined && { role_ids: input.role_ids }),
                ...(input.agent_type !== undefined && { agent_type: input.agent_type }),
                ...(input.language !== undefined && { language: input.language }),
                ...(input.time_zone !== undefined && { time_zone: input.time_zone }),
                ...(input.focus_mode !== undefined && { focus_mode: input.focus_mode })
            },
            retries: 10
        });

        const providerAgent = OutputSchema.parse(response.data);
        return providerAgent;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
