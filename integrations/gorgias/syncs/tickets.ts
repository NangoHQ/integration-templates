import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SenderSchema = z.object({
    id: z.number().optional().describe('The unique identifier of the sender'),
    email: z.string().optional().describe('The email address of the sender'),
    name: z.string().optional().describe('The display name of the sender'),
    avatar_url: z.string().optional().describe('The URL of the sender avatar image')
});

const AttachmentSchema = z.object({
    url: z.string().describe('The URL of the attachment file'),
    name: z.string().optional().describe('The file name of the attachment'),
    size: z.number().optional().describe('The file size in bytes')
});

const MessageSchema = z.object({
    id: z.number().describe('The unique identifier of the message'),
    body_text: z.string().nullish().describe('The plain text body of the message'),
    body_html: z.string().nullish().describe('The HTML body of the message'),
    channel: z.string().nullish().describe('The channel used for this message'),
    created_datetime: z.string().nullish().describe('The ISO8601 datetime when the message was created'),
    updated_datetime: z.string().nullish().describe('The ISO8601 datetime when the message was last updated'),
    sender: SenderSchema.nullish().describe('The user or customer who sent this message'),
    attachments: z.array(AttachmentSchema).nullish().describe('Files attached to the message')
});

const TagSchema = z.object({
    id: z.number().describe('The unique identifier of the tag'),
    name: z.string().describe('The name of the tag'),
    color: z.string().optional().describe('The color associated with the tag'),
    description: z.string().optional().describe('The description of the tag'),
    created_datetime: z.string().optional().describe('The ISO8601 datetime when the tag was created'),
    updated_datetime: z.string().optional().describe('The ISO8601 datetime when the tag was last updated')
});

const SatisfactionSurveySchema = z.object({
    id: z.number().describe('The unique identifier of the satisfaction survey'),
    score: z.number().optional().describe('The satisfaction score given by the customer'),
    comment: z.string().optional().describe('The textual comment left by the customer'),
    sent_datetime: z.string().optional().describe('The ISO8601 datetime when the survey was sent'),
    scored_datetime: z.string().optional().describe('The ISO8601 datetime when the survey was scored')
});

const TicketSchema = z
    .object({
        id: z.string().describe('The unique identifier of the ticket'),
        subject: z.string().optional().describe('The subject line of the ticket'),
        status: z.string().optional().describe('The current status of the ticket'),
        channel: z.string().optional().describe('The communication channel through which the ticket was created'),
        messages: z.array(MessageSchema).optional().describe('The full messages associated with the ticket, backfilled from the detail endpoint'),
        customer_id: z.number().optional().describe('The unique identifier of the customer associated with the ticket'),
        assignee_user_id: z.number().optional().describe('The unique identifier of the agent assigned to the ticket'),
        requester_id: z.number().optional().describe('The unique identifier of the user who requested the ticket'),
        tags: z.array(TagSchema).optional().describe('Tags applied to the ticket'),
        created_datetime: z.string().optional().describe('The ISO8601 datetime when the ticket was created'),
        updated_datetime: z.string().optional().describe('The ISO8601 datetime when the ticket was last updated'),
        opened_datetime: z.string().optional().describe('The ISO8601 datetime when the ticket was first opened'),
        closed_datetime: z.string().optional().describe('The ISO8601 datetime when the ticket was closed'),
        trashed_datetime: z.string().optional().describe('The ISO8601 datetime when the ticket was moved to trash'),
        is_unread: z.boolean().optional().describe('Whether the ticket has unread messages'),
        spam: z.boolean().optional().describe('Whether the ticket is marked as spam'),
        satisfaction_survey: SatisfactionSurveySchema.optional().describe('The satisfaction survey associated with this ticket'),
        uri: z.string().optional().describe('The API URI of the ticket resource'),
        external_id: z.string().optional().describe('An external identifier set for the ticket'),
        meta: z.record(z.string(), z.unknown()).optional().describe('Additional metadata about the ticket')
    })
    .describe('A customer support ticket in Gorgias with its full messages and metadata');

const ListTicketSchema = z.object({
    id: z.number(),
    subject: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    channel: z.string().nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional()
});

const DetailTicketSchema = z.object({
    id: z.number(),
    subject: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    channel: z.string().nullable().optional(),
    messages: z.array(z.unknown()).nullable().optional(),
    customer_id: z.number().nullable().optional(),
    assignee_user_id: z.number().nullable().optional(),
    requester_id: z.number().nullable().optional(),
    tags: z.array(z.unknown()).nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    updated_datetime: z.string().nullable().optional(),
    opened_datetime: z.string().nullable().optional(),
    closed_datetime: z.string().nullable().optional(),
    trashed_datetime: z.string().nullable().optional(),
    is_unread: z.boolean().nullable().optional(),
    spam: z.boolean().nullable().optional(),
    satisfaction_survey: z.unknown().nullable().optional(),
    uri: z.string().nullable().optional(),
    external_id: z.string().nullable().optional(),
    meta: z.record(z.string(), z.unknown()).nullable().optional()
});

function normalizeNull<T>(value: T | null | undefined): T | undefined {
    return value === null ? undefined : value;
}

const sync = createSync({
    description: 'Sync tickets with their full messages.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Ticket: TicketSchema
    },

    exec: async (nango) => {
        const params: Record<string, string | number> = {
            order_by: 'updated_datetime:desc'
        };

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-tickets
            endpoint: '/api/tickets',
            params,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit: 100,
                limit_name_in_request: 'limit'
            },
            retries: 3
        };

        await nango.trackDeletesStart('Ticket');

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const pageSchema = z.array(ListTicketSchema);
            const listResponse = pageSchema.safeParse(page);

            if (!listResponse.success) {
                throw new Error(`Failed to parse ticket list page: ${listResponse.error.message}`);
            }

            const tickets = listResponse.data;
            const enrichedTickets: z.infer<typeof TicketSchema>[] = [];

            for (const ticket of tickets) {
                const detailResponse = await nango.get({
                    // https://developers.gorgias.com/reference/get-ticket
                    endpoint: `/api/tickets/${encodeURIComponent(String(ticket.id))}`,
                    retries: 3
                });

                const detailParsed = DetailTicketSchema.safeParse(detailResponse.data);
                if (!detailParsed.success) {
                    throw new Error(`Failed to parse ticket detail for id ${ticket.id}: ${detailParsed.error.message}`);
                }

                const detail = detailParsed.data;
                const enrichedTicket = {
                    id: String(detail.id),
                    subject: normalizeNull(detail.subject),
                    status: normalizeNull(detail.status),
                    channel: normalizeNull(detail.channel),
                    messages: normalizeNull(detail.messages)?.map((msg) => {
                        const parsed = MessageSchema.safeParse(msg);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse message for ticket id ${ticket.id}: ${parsed.error.message}`);
                        }
                        return parsed.data;
                    }),
                    customer_id: normalizeNull(detail.customer_id),
                    assignee_user_id: normalizeNull(detail.assignee_user_id),
                    requester_id: normalizeNull(detail.requester_id),
                    tags: normalizeNull(detail.tags)?.map((tag) => {
                        const parsed = TagSchema.safeParse(tag);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse tag for ticket id ${ticket.id}: ${parsed.error.message}`);
                        }
                        return parsed.data;
                    }),
                    created_datetime: normalizeNull(detail.created_datetime),
                    updated_datetime: normalizeNull(detail.updated_datetime),
                    opened_datetime: normalizeNull(detail.opened_datetime),
                    closed_datetime: normalizeNull(detail.closed_datetime),
                    trashed_datetime: normalizeNull(detail.trashed_datetime),
                    is_unread: normalizeNull(detail.is_unread),
                    spam: normalizeNull(detail.spam),
                    satisfaction_survey: detail.satisfaction_survey ? SatisfactionSurveySchema.parse(detail.satisfaction_survey) : undefined,
                    uri: normalizeNull(detail.uri),
                    external_id: normalizeNull(detail.external_id),
                    meta: normalizeNull(detail.meta)
                };

                enrichedTickets.push(enrichedTicket);
            }

            if (enrichedTickets.length > 0) {
                await nango.batchSave(enrichedTickets, 'Ticket');
            }
        }

        await nango.trackDeletesEnd('Ticket');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
