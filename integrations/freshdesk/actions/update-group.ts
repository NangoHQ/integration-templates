import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the group to update. Example: 1'),
        name: z.string().optional().describe('Name of the group.'),
        description: z.string().optional().describe('Description of the group.'),
        agent_ids: z.array(z.number()).optional().describe('Array of agent user IDs to associate with the group. Pass an empty array to remove all agents.'),
        auto_ticket_assign: z
            .union([z.literal(0), z.literal(1)])
            .optional()
            .describe('Automatic ticket assignment type. Accepted values are 0 (disabled) and 1 (round robin).'),
        escalate_to: z.number().nullable().optional().describe('User ID to whom escalation emails are sent for unassigned tickets. Set to null to clear.'),
        unassigned_for: z
            .union([
                z.literal('30m'),
                z.literal('1h'),
                z.literal('2h'),
                z.literal('4h'),
                z.literal('8h'),
                z.literal('12h'),
                z.literal('1d'),
                z.literal('2d'),
                z.literal('3d')
            ])
            .optional()
            .describe('Time after which an escalation email is sent for unassigned tickets. Accepted values: 30m, 1h, 2h, 4h, 8h, 12h, 1d, 2d, 3d.')
    })
    .describe('Input payload to update a Freshdesk group.');

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    business_hour_id: z.number().nullable().optional(),
    escalate_to: z.number().nullable().optional(),
    unassigned_for: z.string().nullable().optional(),
    agent_ids: z.array(z.number()).optional(),
    auto_ticket_assign: z.number().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the group.'),
        name: z.string().describe('Name of the group.'),
        description: z.string().optional().describe('Description of the group.'),
        business_hour_id: z.number().nullable().optional().describe('Unique ID of the business hour associated with the group.'),
        escalate_to: z.number().nullable().optional().describe('User ID to whom escalation emails are sent for unassigned tickets.'),
        unassigned_for: z.string().optional().describe('Time after which an escalation email is sent for unassigned tickets.'),
        agent_ids: z.array(z.number()).optional().describe('Array of agent user IDs associated with the group.'),
        auto_ticket_assign: z.number().optional().describe('Automatic ticket assignment type.'),
        created_at: z.string().describe('Group creation timestamp in ISO 8601 format.'),
        updated_at: z.string().describe('Group last updated timestamp in ISO 8601 format.')
    })
    .describe('Updated Freshdesk group.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing group on the provider.
 * @pitfalls: Requires admin privileges.
 */
const action = createAction({
    description: 'Update a group in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.freshdesk.com/api/#update_group
            endpoint: `/api/v2/groups/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.agent_ids !== undefined && { agent_ids: input.agent_ids }),
                ...(input.auto_ticket_assign !== undefined && { auto_ticket_assign: input.auto_ticket_assign }),
                ...(input.escalate_to !== undefined && { escalate_to: input.escalate_to }),
                ...(input.unassigned_for !== undefined && { unassigned_for: input.unassigned_for })
            },
            retries: 3
        });

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            name: providerGroup.name,
            ...(providerGroup.description != null && { description: providerGroup.description }),
            ...(providerGroup.business_hour_id != null && { business_hour_id: providerGroup.business_hour_id }),
            ...(providerGroup.escalate_to != null && { escalate_to: providerGroup.escalate_to }),
            ...(providerGroup.unassigned_for != null && { unassigned_for: providerGroup.unassigned_for }),
            ...(providerGroup.agent_ids !== undefined && { agent_ids: providerGroup.agent_ids }),
            ...(providerGroup.auto_ticket_assign !== undefined && { auto_ticket_assign: providerGroup.auto_ticket_assign }),
            created_at: providerGroup.created_at,
            updated_at: providerGroup.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
