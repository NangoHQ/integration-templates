import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the group to retrieve. Example: 1')
    })
    .describe('Input for retrieving a single Freshdesk group');

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    business_hour_id: z.number().nullable(),
    escalate_to: z.number().nullable(),
    unassigned_for: z.string().nullable(),
    agent_ids: z.array(z.number()),
    auto_ticket_assign: z.number(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the group'),
        name: z.string().describe('Name of the group'),
        description: z.string().optional().describe('Description of the group'),
        business_hour_id: z.number().optional().describe('ID of the associated business hour schedule'),
        escalate_to: z.number().optional().describe('ID of the agent to escalate unassigned tickets to'),
        unassigned_for: z.string().optional().describe('Duration after which unassigned tickets are escalated, e.g. "30m"'),
        agent_ids: z.array(z.number()).describe('IDs of agents belonging to the group'),
        auto_ticket_assign: z.number().describe('Automatic ticket assignment type for the group.'),
        created_at: z.string().describe('Timestamp when the group was created'),
        updated_at: z.string().describe('Timestamp when the group was last updated')
    })
    .describe('A Freshdesk group');

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to retrieve an existing group.
 */
const action = createAction({
    description: 'Retrieve a single group from Freshdesk',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#view_group
            endpoint: `/api/v2/groups/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found',
                id: input.id
            });
        }

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            name: providerGroup.name,
            ...(providerGroup.description != null && { description: providerGroup.description }),
            ...(providerGroup.business_hour_id != null && { business_hour_id: providerGroup.business_hour_id }),
            ...(providerGroup.escalate_to != null && { escalate_to: providerGroup.escalate_to }),
            ...(providerGroup.unassigned_for != null && { unassigned_for: providerGroup.unassigned_for }),
            agent_ids: providerGroup.agent_ids,
            auto_ticket_assign: providerGroup.auto_ticket_assign,
            created_at: providerGroup.created_at,
            updated_at: providerGroup.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
