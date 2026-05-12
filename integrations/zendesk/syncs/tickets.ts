import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#json-format
const ZendeskTicketSchema = z.object({
    id: z.number(),
    status: z.string(),
    url: z.string().optional(),
    external_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    type: z.string().nullable().optional(),
    subject: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    recipient: z.string().nullable().optional(),
    requester_id: z.number().nullable().optional(),
    submitter_id: z.number().nullable().optional(),
    assignee_id: z.number().nullable().optional(),
    organization_id: z.number().nullable().optional(),
    group_id: z.number().nullable().optional(),
    collaborator_ids: z.array(z.number()).optional(),
    has_incidents: z.boolean().optional(),
    is_public: z.boolean().optional(),
    due_at: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    custom_fields: z.array(z.unknown()).optional(),
    ticket_form_id: z.number().nullable().optional(),
    brand_id: z.number().nullable().optional()
});

const TicketSchema = z.object({
    id: z.string(),
    url: z.string(),
    external_id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    type: z.string(),
    subject: z.string(),
    description: z.string(),
    priority: z.string(),
    status: z.string(),
    recipient: z.string(),
    requester_id: z.string(),
    submitter_id: z.string(),
    assignee_id: z.string(),
    organization_id: z.string(),
    group_id: z.string(),
    collaborator_ids: z.array(z.string()),
    tags: z.array(z.string()),
    has_incidents: z.boolean(),
    is_public: z.boolean(),
    due_at: z.string(),
    custom_fields: z.array(z.any()),
    ticket_form_id: z.string(),
    brand_id: z.string()
});

// https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#incremental-export
const IncrementalTicketsResponseSchema = z.object({
    tickets: z.array(ZendeskTicketSchema),
    end_time: z.number(),
    next_page: z.string().nullable(),
    count: z.number(),
    end_of_stream: z.boolean()
});

const CheckpointSchema = z.object({
    start_time: z.string()
});

const sync = createSync({
    description: 'Sync tickets from Zendesk Support',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/tickets',
            method: 'POST'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Ticket: TicketSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Use epoch 0 for initial sync if no checkpoint exists
        const startTime = checkpoint ? checkpoint['start_time'] : '0';
        let hasMorePages = true;
        let currentUrl: string | undefined = undefined;

        while (hasMorePages) {
            // https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#incremental-export
            // Cursor-based pagination using next_page URL from response
            let response;
            if (currentUrl) {
                // https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#incremental-export
                response = await nango.get({
                    endpoint: currentUrl,
                    retries: 3
                });
            } else {
                // https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#incremental-export
                response = await nango.get({
                    endpoint: '/api/v2/incremental/tickets',
                    params: {
                        start_time: startTime
                    },
                    retries: 3
                });
            }

            const parsed = IncrementalTicketsResponseSchema.safeParse(response.data);

            if (!parsed.success) {
                throw new Error(`Failed to parse tickets response: ${parsed.error.message}`);
            }

            const { tickets, end_time, next_page, count, end_of_stream } = parsed.data;

            const deletedTickets = tickets.filter((ticket) => ticket.status === 'deleted').map((ticket) => ({ id: String(ticket.id) }));

            const normalizedTickets = tickets
                .filter((ticket) => ticket.status !== 'deleted')
                .map((ticket) => ({
                    id: String(ticket.id),
                    url: ticket.url ?? '',
                    external_id: ticket.external_id ?? '',
                    created_at: ticket.created_at ?? '',
                    updated_at: ticket.updated_at ?? '',
                    type: ticket.type ?? '',
                    subject: ticket.subject ?? '',
                    description: ticket.description ?? '',
                    priority: ticket.priority ?? '',
                    status: ticket.status,
                    recipient: ticket.recipient ?? '',
                    requester_id: ticket.requester_id != null ? String(ticket.requester_id) : '',
                    submitter_id: ticket.submitter_id != null ? String(ticket.submitter_id) : '',
                    assignee_id: ticket.assignee_id != null ? String(ticket.assignee_id) : '',
                    organization_id: ticket.organization_id != null ? String(ticket.organization_id) : '',
                    group_id: ticket.group_id != null ? String(ticket.group_id) : '',
                    collaborator_ids: ticket.collaborator_ids?.map(String) ?? [],
                    tags: ticket.tags ?? [],
                    has_incidents: ticket.has_incidents ?? false,
                    is_public: ticket.is_public ?? false,
                    due_at: ticket.due_at ?? '',
                    custom_fields: ticket.custom_fields ?? [],
                    ticket_form_id: ticket.ticket_form_id != null ? String(ticket.ticket_form_id) : '',
                    brand_id: ticket.brand_id != null ? String(ticket.brand_id) : ''
                }));

            if (normalizedTickets.length > 0) {
                await nango.batchSave(normalizedTickets, 'Ticket');
            }

            if (deletedTickets.length > 0) {
                await nango.batchDelete(deletedTickets, 'Ticket');
            }

            // Save checkpoint after each successful page
            // Use end_time as the next start_time for incremental syncs
            await nango.saveCheckpoint({
                start_time: String(end_time)
            });

            if (end_of_stream || !next_page || count === 0) {
                hasMorePages = false;
            } else {
                const nextUrl = new URL(next_page);
                const nextPath = nextUrl.pathname + nextUrl.search;
                // If the next URL is the same as current, we've reached the end
                if (nextPath === currentUrl) {
                    hasMorePages = false;
                } else {
                    currentUrl = nextPath;
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
