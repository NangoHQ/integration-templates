import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the group. Must be unique within the account.'),
        description: z.string().optional().describe('Description of the group.'),
        agent_ids: z.array(z.number()).optional().describe('Array of agent user IDs to add to the group.'),
        auto_ticket_assign: z
            .union([z.literal(0), z.literal(1)])
            .optional()
            .describe(
                'Automatic ticket assignment type. Accepted values are 0 and 1. Requires a plan that supports automatic ticket assignment. Defaults to 0.'
            ),
        escalate_to: z
            .number()
            .nullable()
            .optional()
            .describe('User ID to whom escalation emails are sent when a ticket is unassigned. Pass null to set to none.'),
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
            .describe(
                'Time after which an escalation email is sent if a ticket remains unassigned. Accepted values: 30m, 1h, 2h, 4h, 8h, 12h, 1d, 2d, 3d. Defaults to 30m.'
            )
    })
    .describe('Input to create a group in Freshdesk.');

const ProviderGroupSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    business_hour_id: z.number().nullable().optional(),
    escalate_to: z.number().nullable().optional(),
    unassigned_for: z.string().optional(),
    agent_ids: z.array(z.number()).nullable().optional(),
    auto_ticket_assign: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the created group.'),
        name: z.string().describe('Name of the group.'),
        description: z.string().optional().describe('Description of the group.'),
        business_hour_id: z.number().optional().describe('Business hour ID associated with the group.'),
        escalate_to: z.number().optional().describe('User ID to whom escalation emails are sent when a ticket is unassigned.'),
        unassigned_for: z.string().optional().describe('Time after which an escalation email is sent if a ticket remains unassigned.'),
        agent_ids: z.array(z.number()).optional().describe('Array of agent user IDs in the group.'),
        auto_ticket_assign: z.number().optional().describe('Automatic ticket assignment type for the group.'),
        created_at: z.string().optional().describe('Timestamp when the group was created.'),
        updated_at: z.string().optional().describe('Timestamp when the group was last updated.')
    })
    .describe('Output from creating a group in Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new group in the Freshdesk account.
 * @pitfalls: Duplicate group names return a 409 conflict, and auto_ticket_assign is not supported on plans without automatic ticket assignment.
 */
const action = createAction({
    description: 'Create a group in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_group
            endpoint: '/api/v2/groups',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.agent_ids !== undefined && { agent_ids: input.agent_ids }),
                ...(input.auto_ticket_assign !== undefined && { auto_ticket_assign: input.auto_ticket_assign }),
                ...(input.escalate_to !== undefined && { escalate_to: input.escalate_to }),
                ...(input.unassigned_for !== undefined && { unassigned_for: input.unassigned_for })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            name: providerGroup.name,
            ...(providerGroup.description != null && { description: providerGroup.description }),
            ...(providerGroup.business_hour_id != null && { business_hour_id: providerGroup.business_hour_id }),
            ...(providerGroup.escalate_to != null && { escalate_to: providerGroup.escalate_to }),
            ...(providerGroup.unassigned_for !== undefined && { unassigned_for: providerGroup.unassigned_for }),
            ...(providerGroup.agent_ids != null && { agent_ids: providerGroup.agent_ids }),
            ...(providerGroup.auto_ticket_assign !== undefined && { auto_ticket_assign: providerGroup.auto_ticket_assign }),
            ...(providerGroup.created_at !== undefined && { created_at: providerGroup.created_at }),
            ...(providerGroup.updated_at !== undefined && { updated_at: providerGroup.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
