import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of tickets to return per page. Max 100.')
});

const TicketSchema = z.object({
    id: z.string(),
    subject: z.union([z.string(), z.null()]),
    content: z.union([z.string(), z.null()]),
    hs_pipeline: z.union([z.string(), z.null()]),
    hs_pipeline_stage: z.union([z.string(), z.null()]),
    hs_ticket_priority: z.union([z.string(), z.null()]),
    hs_ticket_category: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    items: z.array(TicketSchema),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'List support tickets',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-tickets',
        group: 'Tickets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/crm-tickets-v3/basic/get-crm-v3-objects-tickets
        const response = await nango.get({
            endpoint: '/crm/v3/objects/tickets',
            params: {
                properties: 'subject,content,hs_pipeline,hs_pipeline_stage,hs_ticket_priority,hs_ticket_category',
                limit: String(input.limit || 50),
                ...(input.cursor && { after: input.cursor })
            },
            retries: 3
        });

        const tickets = response.data.results || [];

        const items = tickets.map((ticket: any) => ({
            id: ticket.id,
            subject: ticket.properties?.['subject'] ?? null,
            content: ticket.properties?.['content'] ?? null,
            hs_pipeline: ticket.properties?.['hs_pipeline'] ?? null,
            hs_pipeline_stage: ticket.properties?.['hs_pipeline_stage'] ?? null,
            hs_ticket_priority: ticket.properties?.['hs_ticket_priority'] ?? null,
            hs_ticket_category: ticket.properties?.['hs_ticket_category'] ?? null,
            created_at: ticket.createdAt ?? null,
            updated_at: ticket.updatedAt ?? null
        }));

        const next_cursor = response.data.paging?.next?.after || null;

        return {
            items,
            next_cursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
