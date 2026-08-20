import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().min(1).max(100).optional().describe('Number of agents to return per page. Maximum is 100.'),
        email: z.string().optional().describe('Filter by the agent email address.'),
        mobile: z.string().optional().describe('Filter by the agent mobile number.'),
        phone: z.string().optional().describe('Filter by the agent phone number.'),
        state: z.enum(['fulltime', 'occasional']).optional().describe('Filter by agent state.')
    })
    .describe('Input for listing agents from Freshdesk.');

const ProviderContactSchema = z.object({
    active: z.boolean(),
    email: z.string(),
    job_title: z.string().nullable(),
    language: z.string(),
    last_login_at: z.string().nullable(),
    mobile: z.string().nullable(),
    name: z.string(),
    phone: z.union([z.string(), z.number()]).nullable(),
    time_zone: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderAgentSchema = z.object({
    available: z.boolean(),
    available_since: z.string().nullable(),
    occasional: z.boolean(),
    signature: z.string().nullable(),
    group_ids: z.array(z.number()).optional(),
    role_ids: z.array(z.number()).optional(),
    skill_ids: z.array(z.number()).optional(),
    id: z.number(),
    ticket_scope: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    type: z.string(),
    contact: ProviderContactSchema,
    focus_mode: z.boolean()
});

const ContactSchema = z
    .object({
        active: z.boolean().describe('Whether the agent contact is verified.'),
        email: z.string().describe('Email address of the agent.'),
        job_title: z.string().optional().describe('Job title of the agent.'),
        language: z.string().describe('Language of the agent. Default is "en".'),
        last_login_at: z.string().optional().describe('Timestamp of the agent last successful login.'),
        mobile: z.string().optional().describe('Mobile number of the agent.'),
        name: z.string().describe('Name of the agent.'),
        phone: z.string().optional().describe('Telephone number of the agent.'),
        time_zone: z.string().describe('Time zone of the agent.'),
        created_at: z.string().describe('Creation timestamp of the agent contact.'),
        updated_at: z.string().describe('Timestamp of the last update to the agent contact.')
    })
    .describe('Contact details of the agent.');

const AgentSchema = z
    .object({
        id: z.number().describe('User ID of the agent.'),
        available: z.boolean().describe('Whether the agent is accepting new tickets when automatic ticket assignment is enabled.'),
        available_since: z.string().optional().describe('Timestamp when the agent became available or unavailable.'),
        occasional: z.boolean().describe('Whether this is an occasional agent (true) or full-time agent (false).'),
        signature: z.string().optional().describe('Signature of the agent in HTML format.'),
        ticket_scope: z.number().describe('Ticket permission of the agent (1=Global Access, 2=Group Access, 3=Restricted Access).'),
        type: z.string().describe('Type of agent (support_agent, field_agent, collaborator).'),
        skill_ids: z.array(z.number()).describe('Skill IDs associated with the agent.'),
        group_ids: z.array(z.number()).describe('Group IDs associated with the agent.'),
        role_ids: z.array(z.number()).describe('Role IDs associated with the agent.'),
        created_at: z.string().describe('Agent creation timestamp.'),
        updated_at: z.string().describe('Agent updated timestamp.'),
        focus_mode: z.boolean().describe('Focus mode of the agent.'),
        contact: ContactSchema
    })
    .describe('A Freshdesk agent.');

const OutputSchema = z
    .object({
        items: z.array(AgentSchema).describe('List of agents matching the request.'),
        next_page: z.number().optional().describe('Next page number if more results are available.')
    })
    .describe('Output for listing agents from Freshdesk.');

/**
 * @tags: [read]
 * @tagReason: Reads agent records from Freshdesk.
 * @pitfalls: Requires admin privileges; non-admin callers receive 403.
 */
const action = createAction({
    description: 'List agents from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid page number'
            });
        }

        const params: Record<string, string | number> = {
            page: page,
            per_page: input.per_page ?? 30
        };

        if (input.email !== undefined) {
            params['email'] = input.email;
        }
        if (input.mobile !== undefined) {
            params['mobile'] = input.mobile;
        }
        if (input.phone !== undefined) {
            params['phone'] = input.phone;
        }
        if (input.state !== undefined) {
            params['state'] = input.state;
        }

        const response = await nango.get({
            // https://developers.freshdesk.com/api/#list_all_agents
            endpoint: '/api/v2/agents',
            params,
            retries: 3
        });

        const agents = z.array(ProviderAgentSchema).parse(response.data);

        const linkHeader = typeof response.headers?.['link'] === 'string' ? response.headers['link'] : undefined;
        const hasNextPage = linkHeader !== undefined && linkHeader.length > 0;
        const nextPage = hasNextPage ? page + 1 : undefined;

        return {
            items: agents.map((agent) => ({
                id: agent.id,
                available: agent.available,
                available_since: agent.available_since ?? undefined,
                occasional: agent.occasional,
                signature: agent.signature ?? undefined,
                ticket_scope: agent.ticket_scope,
                type: agent.type,
                skill_ids: agent.skill_ids ?? [],
                group_ids: agent.group_ids ?? [],
                role_ids: agent.role_ids ?? [],
                created_at: agent.created_at,
                updated_at: agent.updated_at,
                focus_mode: agent.focus_mode,
                contact: {
                    active: agent.contact.active,
                    email: agent.contact.email,
                    job_title: agent.contact.job_title ?? undefined,
                    language: agent.contact.language,
                    last_login_at: agent.contact.last_login_at ?? undefined,
                    mobile: agent.contact.mobile ?? undefined,
                    name: agent.contact.name,
                    phone: agent.contact.phone != null ? String(agent.contact.phone) : undefined,
                    time_zone: agent.contact.time_zone,
                    created_at: agent.contact.created_at,
                    updated_at: agent.contact.updated_at
                }
            })),
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
