import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Agent ID to update. Example: 1'),
        occasional: z.boolean().optional().describe('Set to true if this is an occasional agent (true => occasional, false => full-time)'),
        signature: z.string().optional().describe('Signature of the agent in HTML format'),
        ticket_scope: z.number().optional().describe('Ticket permission of the agent (1 -> Global Access, 2 -> Group Access, 3 -> Restricted Access)'),
        skill_ids: z.array(z.number()).optional().describe('Skill IDs associated with the agent'),
        group_ids: z.array(z.number()).optional().describe('Group IDs associated with the agent'),
        contribution_group_ids: z
            .array(z.number())
            .optional()
            .describe('IDs of groups that the agent has view-only access to, if the ticket_scope of the agent is 2'),
        role_ids: z.array(z.number()).optional().describe('Role IDs associated with the agent. At least one role should be associated with the agent.'),
        email: z.string().optional().describe('Email address of the agent. May fail if the email exists in multiple accounts in the org.'),
        language: z.string().optional().describe('Language of the agent. Default language is "en"'),
        time_zone: z.string().optional().describe('Time zone of the agent. Default value is time zone of the domain'),
        focus_mode: z.boolean().optional().describe('Focus mode of the agent. Default value is true')
    })
    .describe('Input to update an agent in Freshdesk');

const ProviderContactSchema = z.object({
    active: z.boolean().optional(),
    email: z.string().optional(),
    language: z.string().optional(),
    last_login_at: z.string().nullable().optional(),
    time_zone: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderAgentSchema = z.object({
    id: z.number(),
    available: z.boolean(),
    occasional: z.boolean(),
    ticket_scope: z.number(),
    signature: z.string().nullable().optional(),
    group_ids: z.array(z.number()).nullable().optional(),
    role_ids: z.array(z.number()).nullable().optional(),
    skill_ids: z.array(z.number()).nullable().optional(),
    available_since: z.string().nullable().optional(),
    type: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    contact: ProviderContactSchema.nullable().optional(),
    focus_mode: z.boolean().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the agent'),
        available: z.boolean().describe('Whether the agent is accepting new tickets'),
        occasional: z.boolean().describe('Whether this is an occasional agent'),
        ticket_scope: z.number().describe('Ticket permission of the agent (1 -> Global Access, 2 -> Group Access, 3 -> Restricted Access)'),
        signature: z.string().optional().describe('Signature of the agent in HTML format'),
        group_ids: z.array(z.number()).optional().describe('Group IDs associated with the agent'),
        role_ids: z.array(z.number()).optional().describe('Role IDs associated with the agent'),
        skill_ids: z.array(z.number()).optional().describe('Skill IDs associated with the agent'),
        available_since: z.string().optional().describe('Timestamp when the agent became available or unavailable'),
        type: z.string().describe('Type of agent (support_agent, field_agent, collaborator)'),
        created_at: z.string().describe('Agent creation timestamp'),
        updated_at: z.string().describe('Agent last updated timestamp'),
        contact: z
            .object({
                active: z.boolean().optional().describe('Whether the agent contact is verified'),
                email: z.string().optional().describe('Email address of the agent'),
                language: z.string().optional().describe('Language of the agent'),
                last_login_at: z.string().optional().describe("Timestamp of the agent's last successful login"),
                time_zone: z.string().optional().describe('Time zone of the agent'),
                created_at: z.string().optional().describe('Contact creation timestamp'),
                updated_at: z.string().optional().describe('Contact last updated timestamp')
            })
            .optional()
            .describe('Contact details of the agent'),
        focus_mode: z.boolean().optional().describe('Focus mode of the agent')
    })
    .describe('Updated agent object returned by Freshdesk');

/**
 * @tags: [write]
 * @tagReason: Updates agent properties on the provider.
 * @pitfalls: Name, phone, mobile and job title cannot be updated via this API. An agent cannot update their own ticket_scope or role_ids.
 */
const action = createAction({
    description: 'Update a agent in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.occasional !== undefined) {
            data['occasional'] = input.occasional;
        }
        if (input.signature !== undefined) {
            data['signature'] = input.signature;
        }
        if (input.ticket_scope !== undefined) {
            data['ticket_scope'] = input.ticket_scope;
        }
        if (input.skill_ids !== undefined) {
            data['skill_ids'] = input.skill_ids;
        }
        if (input.group_ids !== undefined) {
            data['group_ids'] = input.group_ids;
        }
        if (input.contribution_group_ids !== undefined) {
            data['contribution_group_ids'] = input.contribution_group_ids;
        }
        if (input.role_ids !== undefined) {
            data['role_ids'] = input.role_ids;
        }
        if (input.email !== undefined) {
            data['email'] = input.email;
        }
        if (input.language !== undefined) {
            data['language'] = input.language;
        }
        if (input.time_zone !== undefined) {
            data['time_zone'] = input.time_zone;
        }
        if (input.focus_mode !== undefined) {
            data['focus_mode'] = input.focus_mode;
        }

        // https://developers.freshdesk.com/api/#update_agent
        const response = await nango.patch({
            endpoint: `/api/v2/agents/${encodeURIComponent(String(input.id))}`,
            data,
            retries: 3
        });

        const providerAgent = ProviderAgentSchema.parse(response.data);

        return {
            id: providerAgent.id,
            available: providerAgent.available,
            occasional: providerAgent.occasional,
            ticket_scope: providerAgent.ticket_scope,
            ...(providerAgent.signature != null && { signature: providerAgent.signature }),
            ...(providerAgent.group_ids != null && { group_ids: providerAgent.group_ids }),
            ...(providerAgent.role_ids != null && { role_ids: providerAgent.role_ids }),
            ...(providerAgent.skill_ids != null && { skill_ids: providerAgent.skill_ids }),
            ...(providerAgent.available_since != null && { available_since: providerAgent.available_since }),
            type: providerAgent.type,
            created_at: providerAgent.created_at,
            updated_at: providerAgent.updated_at,
            ...(providerAgent.contact != null && {
                contact: {
                    ...(providerAgent.contact.active !== undefined && { active: providerAgent.contact.active }),
                    ...(providerAgent.contact.email !== undefined && { email: providerAgent.contact.email }),
                    ...(providerAgent.contact.language !== undefined && { language: providerAgent.contact.language }),
                    ...(providerAgent.contact.last_login_at != null && { last_login_at: providerAgent.contact.last_login_at }),
                    ...(providerAgent.contact.time_zone !== undefined && { time_zone: providerAgent.contact.time_zone }),
                    ...(providerAgent.contact.created_at !== undefined && { created_at: providerAgent.contact.created_at }),
                    ...(providerAgent.contact.updated_at !== undefined && { updated_at: providerAgent.contact.updated_at })
                }
            }),
            ...(providerAgent.focus_mode != null && { focus_mode: providerAgent.focus_mode })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
