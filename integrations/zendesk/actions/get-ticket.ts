import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ticket_id: z.union([z.string(), z.number()]).describe('Ticket ID to retrieve. Example: "1" or 1'),
    include: z
        .string()
        .optional()
        .describe(
            'Comma-separated list of sideloads to include. Example: "users,organizations,groups". See: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#sideloads'
        )
});

const ProviderTicketSchema = z.object({
    id: z.number(),
    url: z.string(),
    subject: z.string(),
    description: z.string().optional(),
    priority: z.string().nullable().optional(),
    status: z.string(),
    type: z.string().nullable().optional(),
    requester_id: z.number().optional(),
    assignee_id: z.number().nullable().optional(),
    organization_id: z.number().nullable().optional(),
    group_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    tags: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.number(),
    url: z.string(),
    subject: z.string(),
    description: z.string().optional(),
    priority: z.string().optional(),
    status: z.string(),
    type: z.string().optional(),
    requester_id: z.number().optional(),
    assignee_id: z.number().optional(),
    organization_id: z.number().optional(),
    group_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    tags: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Retrieve a ticket by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:tickets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const ticketId = typeof input.ticket_id === 'number' ? input.ticket_id.toString() : input.ticket_id;

        const config: Parameters<typeof nango.get>[0] = {
            // https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#show-ticket
            endpoint: `/api/v2/tickets/${encodeURIComponent(ticketId)}.json`,
            retries: 3
        };

        if (input.include) {
            config.params = {
                include: input.include
            };
        }

        const response = await nango.get(config);

        const rawTicket = ProviderTicketSchema.parse(response.data.ticket);

        return {
            id: rawTicket.id,
            url: rawTicket.url,
            subject: rawTicket.subject,
            status: rawTicket.status,
            ...(rawTicket.description !== undefined && { description: rawTicket.description }),
            ...(rawTicket.priority != null && { priority: rawTicket.priority }),
            ...(rawTicket.type != null && { type: rawTicket.type }),
            ...(rawTicket.requester_id !== undefined && { requester_id: rawTicket.requester_id }),
            ...(rawTicket.assignee_id != null && { assignee_id: rawTicket.assignee_id }),
            ...(rawTicket.organization_id != null && { organization_id: rawTicket.organization_id }),
            ...(rawTicket.group_id !== undefined && { group_id: rawTicket.group_id }),
            ...(rawTicket.created_at !== undefined && { created_at: rawTicket.created_at }),
            ...(rawTicket.updated_at !== undefined && { updated_at: rawTicket.updated_at }),
            ...(rawTicket.tags !== undefined && { tags: rawTicket.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
