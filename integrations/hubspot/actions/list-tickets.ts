import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of tickets to return per page. Max 100.')
});

const TicketSchema = z.object({
    id: z.string(),
    subject: z.string().optional(),
    content: z.string().optional(),
    hs_pipeline: z.string().optional(),
    hs_pipeline_stage: z.string().optional(),
    hs_ticket_priority: z.string().optional(),
    hs_ticket_category: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TicketSchema),
    nextCursor: z.string().optional()
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
            subject: ticket.properties?.['subject'] ?? undefined,
            content: ticket.properties?.['content'] ?? undefined,
            hs_pipeline: ticket.properties?.['hs_pipeline'] ?? undefined,
            hs_pipeline_stage: ticket.properties?.['hs_pipeline_stage'] ?? undefined,
            hs_ticket_priority: ticket.properties?.['hs_ticket_priority'] ?? undefined,
            hs_ticket_category: ticket.properties?.['hs_ticket_category'] ?? undefined,
            createdAt: ticket.createdAt ?? undefined,
            updatedAt: ticket.updatedAt ?? undefined
        }));

        const nextCursor = response.data.paging?.next?.after || undefined;

        return {
            items,
            nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
