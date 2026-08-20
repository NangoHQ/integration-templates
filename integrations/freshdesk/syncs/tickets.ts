import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TicketSchema = z
    .object({
        id: z.string().describe('Unique identifier of the ticket'),
        subject: z.string().optional().describe('Subject line of the ticket'),
        description: z.string().optional().describe('HTML description of the ticket'),
        description_text: z.string().optional().describe('Plain text description of the ticket'),
        status: z.number().describe('Current status of the ticket (2=Open, 3=Pending, 4=Resolved, 5=Closed)'),
        priority: z.number().describe('Priority level of the ticket (1=Low, 2=Medium, 3=High, 4=Urgent)'),
        source: z
            .number()
            .describe('Channel through which the ticket was created (1=Email, 2=Portal, 3=Phone, 7=Chat, 8=Feedback Widget, 9=Outbound Email, 10=Shopify)'),
        source_info: z.number().optional().describe('Additional source information for the ticket'),
        requester_id: z.number().describe('ID of the contact who raised the ticket'),
        responder_id: z.number().optional().describe('ID of the agent assigned to the ticket'),
        group_id: z.number().optional().describe('ID of the group to which the ticket is assigned'),
        company_id: z.number().optional().describe('ID of the company associated with the ticket'),
        product_id: z.number().optional().describe('ID of the product associated with the ticket'),
        email_config_id: z.number().optional().describe('ID of the email configuration used for the ticket'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom fields configured for the ticket'),
        tags: z.array(z.string()).optional().describe('Tags associated with the ticket'),
        cc_emails: z.array(z.string()).optional().describe('Email addresses added in the CC field'),
        fwd_emails: z.array(z.string()).optional().describe('Email addresses to which the ticket was forwarded'),
        reply_cc_emails: z.array(z.string()).optional().describe('Email addresses added in the reply CC field'),
        to_emails: z.array(z.string()).optional().describe('Email addresses in the To field'),
        type: z.string().optional().describe('Type of the ticket (e.g., Question, Incident, Problem, Feature Request)'),
        created_at: z.string().describe('Timestamp when the ticket was created, in UTC'),
        updated_at: z.string().describe('Timestamp when the ticket was last updated, in UTC'),
        due_by: z.string().optional().describe('Timestamp by which the ticket is due for resolution, in UTC'),
        fr_due_by: z.string().optional().describe('Timestamp by which the first response is due, in UTC'),
        is_escalated: z.boolean().describe('Whether the ticket has been escalated due to SLA breach'),
        fr_escalated: z.boolean().optional().describe('Whether the first response has been escalated due to SLA breach'),
        spam: z.boolean().optional().describe('Whether the ticket has been marked as spam')
    })
    .describe('A support ticket in Freshdesk');

const CheckpointSchema = z
    .object({
        updated_after: z.string().describe('ISO 8601 timestamp of the last processed ticket updated_at'),
        page: z.number().describe('Page number to resume pagination within the same updated_since window')
    })
    .describe('Checkpoint for incremental ticket sync');

const ProviderTicketSchema = z.object({
    id: z.number(),
    subject: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    description_text: z.string().nullable().optional(),
    status: z.number(),
    priority: z.number(),
    source: z.number(),
    source_info: z.number().nullable().optional(),
    requester_id: z.number(),
    responder_id: z.number().nullable().optional(),
    group_id: z.number().nullable().optional(),
    company_id: z.number().nullable().optional(),
    product_id: z.number().nullable().optional(),
    email_config_id: z.number().nullable().optional(),
    custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    cc_emails: z.array(z.string()).nullable().optional(),
    fwd_emails: z.array(z.string()).nullable().optional(),
    reply_cc_emails: z.array(z.string()).nullable().optional(),
    to_emails: z.union([z.array(z.string()), z.null()]).optional(),
    type: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    due_by: z.string().nullable().optional(),
    fr_due_by: z.string().nullable().optional(),
    is_escalated: z.boolean(),
    fr_escalated: z.boolean().optional(),
    spam: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync tickets from Freshdesk',
    version: '3.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Ticket: TicketSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let updatedAfter: string | undefined = checkpoint ? checkpoint.updated_after || undefined : undefined;
        let page: number | undefined = checkpoint ? checkpoint.page : 1;
        let lastProcessedUpdatedAt: string | undefined;

        const params: Record<string, string | number> = {
            per_page: 100,
            order_by: 'updated_at',
            order_type: 'asc'
        };
        if (updatedAfter) {
            params['updated_since'] = updatedAfter;
        }
        if (page !== undefined) {
            params['page'] = page;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_tickets
            endpoint: '/api/v2/tickets',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        // https://developers.freshdesk.com/api/#list_all_tickets
        for await (const pageResults of nango.paginate(proxyConfig)) {
            const tickets = pageResults.map((item: unknown) => {
                const parsed = ProviderTicketSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ticket: ${parsed.error.message}`);
                }
                const ticket = parsed.data;
                return {
                    id: String(ticket.id),
                    ...(ticket.subject != null && { subject: ticket.subject }),
                    ...(ticket.description != null && { description: ticket.description }),
                    ...(ticket.description_text != null && { description_text: ticket.description_text }),
                    status: ticket.status,
                    priority: ticket.priority,
                    source: ticket.source,
                    ...(ticket.source_info != null && { source_info: ticket.source_info }),
                    requester_id: ticket.requester_id,
                    ...(ticket.responder_id != null && { responder_id: ticket.responder_id }),
                    ...(ticket.group_id != null && { group_id: ticket.group_id }),
                    ...(ticket.company_id != null && { company_id: ticket.company_id }),
                    ...(ticket.product_id != null && { product_id: ticket.product_id }),
                    ...(ticket.email_config_id != null && { email_config_id: ticket.email_config_id }),
                    ...(ticket.custom_fields != null && { custom_fields: ticket.custom_fields }),
                    ...(ticket.tags != null && { tags: ticket.tags }),
                    ...(ticket.cc_emails != null && { cc_emails: ticket.cc_emails }),
                    ...(ticket.fwd_emails != null && { fwd_emails: ticket.fwd_emails }),
                    ...(ticket.reply_cc_emails != null && { reply_cc_emails: ticket.reply_cc_emails }),
                    ...(ticket.to_emails != null && { to_emails: ticket.to_emails }),
                    ...(ticket.type != null && { type: ticket.type }),
                    created_at: ticket.created_at,
                    updated_at: ticket.updated_at,
                    ...(ticket.due_by != null && { due_by: ticket.due_by }),
                    ...(ticket.fr_due_by != null && { fr_due_by: ticket.fr_due_by }),
                    is_escalated: ticket.is_escalated,
                    ...(ticket.fr_escalated != null && { fr_escalated: ticket.fr_escalated }),
                    ...(ticket.spam != null && { spam: ticket.spam })
                };
            });

            if (tickets.length === 0) {
                if (page === undefined && lastProcessedUpdatedAt) {
                    await nango.saveCheckpoint({
                        updated_after: lastProcessedUpdatedAt,
                        page: 1
                    });
                }
                continue;
            }

            await nango.batchSave(tickets, 'Ticket');
            const lastTicket = tickets[tickets.length - 1];
            if (!lastTicket) {
                throw new Error('Unexpected empty tickets array after length check');
            }
            lastProcessedUpdatedAt = lastTicket.updated_at;

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || lastProcessedUpdatedAt,
                    page
                });
                continue;
            }

            updatedAfter = lastProcessedUpdatedAt;
            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                page: 1
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
