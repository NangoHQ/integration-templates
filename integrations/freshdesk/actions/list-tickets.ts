import { z } from 'zod';
import { createAction } from 'nango';

const ProviderTicketSchema = z.object({
    id: z.number(),
    cc_emails: z.array(z.string()).optional(),
    fwd_emails: z.array(z.string()).optional(),
    reply_cc_emails: z.array(z.string()).optional(),
    email_config_id: z.number().nullable().optional(),
    fr_escalated: z.boolean(),
    group_id: z.number().nullable().optional(),
    priority: z.number(),
    requester_id: z.number(),
    responder_id: z.number().nullable().optional(),
    source: z.number(),
    source_info: z.number().nullable().optional(),
    spam: z.boolean(),
    status: z.number(),
    subject: z.string(),
    company_id: z.number().nullable().optional(),
    to_emails: z.array(z.string()).nullable().optional(),
    product_id: z.number().nullable().optional(),
    type: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    due_by: z.string(),
    fr_due_by: z.string(),
    is_escalated: z.boolean(),
    description_text: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
    attachments: z.array(z.unknown()).optional(),
    stats: z
        .object({
            closed_at: z.string().nullable().optional(),
            resolved_at: z.string().nullable().optional(),
            first_responded_at: z.string().nullable().optional()
        })
        .optional(),
    requester: z
        .object({
            email: z.string().nullable().optional(),
            id: z.number(),
            mobile: z.string().nullable().optional(),
            name: z.string().nullable().optional(),
            phone: z.string().nullable().optional()
        })
        .optional()
});

const TicketSchema = z.object({
    id: z.number().describe('Unique ID of the ticket.'),
    cc_emails: z.array(z.string()).optional().describe("Email addresses in the 'cc' field of the incoming ticket email."),
    fwd_emails: z.array(z.string()).optional().describe('Email addresses added while forwarding the ticket.'),
    reply_cc_emails: z.array(z.string()).optional().describe('Email addresses added while replying to the ticket.'),
    email_config_id: z.number().optional().describe('ID of the email config used for this ticket.'),
    fr_escalated: z.boolean().describe('Whether the ticket escalated due to first response time breach.'),
    group_id: z.number().optional().describe('ID of the assigned group.'),
    priority: z.number().describe('Priority of the ticket. 1=Low, 2=Medium, 3=High, 4=Urgent.'),
    requester_id: z.number().describe('User ID of the requester.'),
    responder_id: z.number().optional().describe('ID of the assigned agent.'),
    source: z.number().describe('Channel through which the ticket was created.'),
    source_info: z.number().optional().describe('Specific source identifier.'),
    spam: z.boolean().describe('Whether the ticket is marked as spam.'),
    status: z.number().describe('Status of the ticket. 2=Open, 3=Pending, 4=Resolved, 5=Closed.'),
    subject: z.string().describe('Subject of the ticket.'),
    company_id: z.number().optional().describe('ID of the associated company.'),
    to_emails: z.array(z.string()).optional().describe('Email addresses to which the ticket was originally sent.'),
    product_id: z.number().optional().describe('ID of the associated product.'),
    type: z.string().optional().describe('Type of issue.'),
    created_at: z.string().describe('Ticket creation timestamp in UTC.'),
    updated_at: z.string().describe('Ticket last updated timestamp in UTC.'),
    due_by: z.string().describe('Timestamp when the ticket is due to be resolved.'),
    fr_due_by: z.string().describe('Timestamp when the first response is due.'),
    is_escalated: z.boolean().describe('Whether the ticket has been escalated for any reason.'),
    description_text: z.string().optional().describe('Plain text description. Requires include=description.'),
    description: z.string().optional().describe('HTML description. Requires include=description.'),
    custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key-value pairs of custom field names and values.'),
    tags: z.array(z.string()).optional().describe('Tags associated with the ticket.'),
    attachments: z.array(z.unknown()).optional().describe('Attachments on the ticket.'),
    stats: z
        .object({
            closed_at: z.string().optional().describe('Timestamp when the ticket was closed.'),
            resolved_at: z.string().optional().describe('Timestamp when the ticket was resolved.'),
            first_responded_at: z.string().optional().describe('Timestamp of the first response.')
        })
        .optional()
        .describe('Ticket statistics. Requires include=stats.'),
    requester: z
        .object({
            email: z.string().optional().describe('Requester email address.'),
            id: z.number().describe('Requester user ID.'),
            mobile: z.string().optional().describe('Requester mobile number.'),
            name: z.string().optional().describe('Requester name.'),
            phone: z.string().optional().describe('Requester phone number.')
        })
        .optional()
        .describe('Requester details. Requires include=requester.')
});

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().min(1).max(100).optional().describe('Number of tickets per page. Maximum is 100.'),
        filter: z.enum(['new_and_my_open', 'watching', 'spam', 'deleted']).optional().describe('Predefined filter for the ticket list.'),
        requester_id: z.number().optional().describe('Filter tickets by requester ID.'),
        email: z.string().optional().describe('Filter tickets by requester email address.'),
        company_id: z.number().optional().describe('Filter tickets by company ID.'),
        updated_since: z.string().optional().describe('Filter tickets updated after the given UTC timestamp. Example: 2015-01-19T02:00:00Z'),
        order_by: z.enum(['created_at', 'due_by', 'updated_at', 'status']).optional().describe('Field to sort tickets by.'),
        order_type: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
        include: z
            .array(z.enum(['stats', 'requester', 'description']))
            .optional()
            .describe('Additional resources to embed in the response. Each embedded resource consumes extra API credits.')
    })
    .describe('Input parameters for listing Freshdesk tickets.');

const OutputSchema = z
    .object({
        items: z.array(TicketSchema).describe('List of tickets returned for the current page.'),
        next_page: z.string().optional().describe('Pagination cursor (page number) for the next page. Omit if there are no more pages.')
    })
    .describe('Output of the list tickets action.');

/**
 * @tags: [read]
 * @tagReason: Reads ticket data from Freshdesk.
 * @pitfalls: By default only tickets from the past 30 days are returned; use updated_since for older tickets. Description requires include=description on newer accounts, and each include option consumes extra API credits.
 */
const action = createAction({
    description: 'List tickets from Freshdesk.',
    version: '2.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing a page number.'
            });
        }
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        // https://developers.freshdesk.com/api/#list_all_tickets
        const response = await nango.get({
            endpoint: '/api/v2/tickets',
            params: {
                page: page,
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.requester_id !== undefined && { requester_id: input.requester_id }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.company_id !== undefined && { company_id: input.company_id }),
                ...(input.updated_since !== undefined && { updated_since: input.updated_since }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.order_type !== undefined && { order_type: input.order_type }),
                ...(input.include !== undefined && input.include.length > 0 && { include: input.include.join(',') })
            },
            retries: 3
        });

        const tickets = z.array(ProviderTicketSchema).parse(response.data);

        let next_page: string | undefined;
        const linkHeader = response.headers?.['link'];
        if (typeof linkHeader === 'string' && linkHeader.includes('rel="next"')) {
            const match = linkHeader.match(/[?&]page=(\d+)/);
            if (match) {
                next_page = match[1];
            }
        }

        return {
            items: tickets.map((ticket) => ({
                id: ticket.id,
                cc_emails: ticket.cc_emails,
                fwd_emails: ticket.fwd_emails,
                reply_cc_emails: ticket.reply_cc_emails,
                ...(ticket.email_config_id != null && { email_config_id: ticket.email_config_id }),
                fr_escalated: ticket.fr_escalated,
                ...(ticket.group_id != null && { group_id: ticket.group_id }),
                priority: ticket.priority,
                requester_id: ticket.requester_id,
                ...(ticket.responder_id != null && { responder_id: ticket.responder_id }),
                source: ticket.source,
                ...(ticket.source_info != null && { source_info: ticket.source_info }),
                spam: ticket.spam,
                status: ticket.status,
                subject: ticket.subject,
                ...(ticket.company_id != null && { company_id: ticket.company_id }),
                ...(ticket.to_emails != null && { to_emails: ticket.to_emails }),
                ...(ticket.product_id != null && { product_id: ticket.product_id }),
                ...(ticket.type != null && { type: ticket.type }),
                created_at: ticket.created_at,
                updated_at: ticket.updated_at,
                due_by: ticket.due_by,
                fr_due_by: ticket.fr_due_by,
                is_escalated: ticket.is_escalated,
                ...(ticket.description_text != null && { description_text: ticket.description_text }),
                ...(ticket.description != null && { description: ticket.description }),
                ...(ticket.custom_fields != null && { custom_fields: ticket.custom_fields }),
                ...(ticket.tags != null && { tags: ticket.tags }),
                ...(ticket.attachments != null && { attachments: ticket.attachments }),
                ...(ticket.stats != null && {
                    stats: {
                        ...(ticket.stats.closed_at != null && { closed_at: ticket.stats.closed_at }),
                        ...(ticket.stats.resolved_at != null && { resolved_at: ticket.stats.resolved_at }),
                        ...(ticket.stats.first_responded_at != null && { first_responded_at: ticket.stats.first_responded_at })
                    }
                }),
                ...(ticket.requester != null && {
                    requester: {
                        id: ticket.requester.id,
                        ...(ticket.requester.email != null && { email: ticket.requester.email }),
                        ...(ticket.requester.mobile != null && { mobile: ticket.requester.mobile }),
                        ...(ticket.requester.name != null && { name: ticket.requester.name }),
                        ...(ticket.requester.phone != null && { phone: ticket.requester.phone })
                    }
                })
            })),
            ...(next_page !== undefined && { next_page })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
