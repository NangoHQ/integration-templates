import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique ID of the ticket to retrieve. Example: 20')
    })
    .describe('Input for retrieving a single Freshdesk ticket');

const ProviderAttachmentSchema = z
    .object({
        id: z.number(),
        content_type: z.string().nullable().optional(),
        file_size: z.number().nullable().optional(),
        name: z.string().nullable().optional(),
        attachment_url: z.string().nullable().optional(),
        created_at: z.string().nullable().optional()
    })
    .passthrough();

const ProviderTicketSchema = z
    .object({
        id: z.number(),
        attachments: z.array(ProviderAttachmentSchema).nullable().optional(),
        cc_emails: z.array(z.string()).nullable().optional(),
        company_id: z.number().nullable().optional(),
        created_at: z.string().nullable().optional(),
        custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
        deleted: z.boolean().nullable().optional(),
        description: z.string().nullable().optional(),
        description_text: z.string().nullable().optional(),
        due_by: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        email_config_id: z.number().nullable().optional(),
        facebook_id: z.string().nullable().optional(),
        fr_due_by: z.string().nullable().optional(),
        fr_escalated: z.boolean().nullable().optional(),
        fwd_emails: z.array(z.string()).nullable().optional(),
        group_id: z.number().nullable().optional(),
        is_escalated: z.boolean().nullable().optional(),
        name: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        priority: z.number().nullable().optional(),
        product_id: z.number().nullable().optional(),
        reply_cc_emails: z.array(z.string()).nullable().optional(),
        requester_id: z.number().nullable().optional(),
        responder_id: z.number().nullable().optional(),
        source: z.number().nullable().optional(),
        source_info: z.number().nullable().optional(),
        spam: z.boolean().nullable().optional(),
        status: z.number().nullable().optional(),
        subject: z.string().nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
        to_emails: z.array(z.string()).nullable().optional(),
        twitter_id: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the ticket'),
        attachments: z
            .array(
                z
                    .object({
                        id: z.number().describe('Unique ID of the attachment'),
                        content_type: z.string().optional().describe('MIME type of the attachment'),
                        file_size: z.number().optional().describe('Size of the attachment in bytes'),
                        name: z.string().optional().describe('Name of the attachment file'),
                        attachment_url: z.string().optional().describe('URL to download the attachment'),
                        created_at: z.string().optional().describe('Attachment creation timestamp')
                    })
                    .passthrough()
            )
            .optional()
            .describe('Ticket attachments'),
        cc_emails: z.array(z.string()).optional().describe("Email addresses added in the 'cc' field of the incoming ticket email"),
        company_id: z.number().optional().describe('ID of the company to which this ticket belongs'),
        created_at: z.string().optional().describe('Ticket creation timestamp in UTC'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key value pairs containing the names and values of custom fields'),
        deleted: z.boolean().optional().describe('Set to true if the ticket has been deleted/trashed'),
        description: z.string().optional().describe('HTML content of the ticket'),
        description_text: z.string().optional().describe('Content of the ticket in plain text'),
        due_by: z.string().optional().describe('Timestamp that denotes when the ticket is due to be resolved'),
        email: z.string().optional().describe('Email address of the requester'),
        email_config_id: z.number().optional().describe('ID of email config which is used for this ticket'),
        facebook_id: z.string().optional().describe('Facebook ID of the requester'),
        fr_due_by: z.string().optional().describe('Timestamp that denotes when the first response is due'),
        fr_escalated: z.boolean().optional().describe('Set to true if the ticket has been escalated as the result of first response time being breached'),
        fwd_emails: z.array(z.string()).optional().describe('Email addresses added while forwarding a ticket'),
        group_id: z.number().optional().describe('ID of the group to which the ticket has been assigned'),
        is_escalated: z.boolean().optional().describe('Set to true if the ticket has been escalated for any reason'),
        name: z.string().optional().describe('Name of the requester'),
        phone: z.string().optional().describe('Phone number of the requester'),
        priority: z.number().optional().describe('Priority of the ticket'),
        product_id: z.number().optional().describe('ID of the product to which the ticket is associated'),
        reply_cc_emails: z.array(z.string()).optional().describe('Email addresses added while replying to a ticket'),
        requester_id: z.number().optional().describe('User ID of the requester'),
        responder_id: z.number().optional().describe('ID of the agent to whom the ticket has been assigned'),
        source: z.number().optional().describe('The channel through which the ticket was created'),
        source_info: z.number().optional().describe('Identifies the source through which the ticket was created'),
        spam: z.boolean().optional().describe('Set to true if the ticket has been marked as spam'),
        status: z.number().optional().describe('Status of the ticket'),
        subject: z.string().optional().describe('Subject of the ticket'),
        tags: z.array(z.string()).optional().describe('Tags that have been associated with the ticket'),
        to_emails: z.array(z.string()).optional().describe('Email addresses to which the ticket was originally sent'),
        twitter_id: z.string().optional().describe('Twitter handle of the requester'),
        type: z.string().optional().describe('Helps categorize the ticket according to the different kinds of issues your support team deals with'),
        updated_at: z.string().optional().describe('Ticket updated timestamp in UTC')
    })
    .describe('A single Freshdesk ticket');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single ticket from Freshdesk without modifying it.
 * @pitfalls: Freshdesk v2 omits requester and company names from ticket responses by default; only `requester_id` and `company_id` are returned, so callers must fetch contact or company details separately.
 */
const action = createAction({
    description: 'Retrieve a single ticket from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.freshdesk.com/api/#view_a_ticket
            endpoint: `/api/v2/tickets/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ticket not found',
                id: input.id
            });
        }

        const ticket = ProviderTicketSchema.parse(response.data);

        return {
            id: ticket.id,
            ...(ticket.attachments != null && {
                attachments: ticket.attachments.map((attachment) => ({
                    id: attachment.id,
                    ...(attachment.content_type != null && { content_type: attachment.content_type }),
                    ...(attachment.file_size != null && { file_size: attachment.file_size }),
                    ...(attachment.name != null && { name: attachment.name }),
                    ...(attachment.attachment_url != null && { attachment_url: attachment.attachment_url }),
                    ...(attachment.created_at != null && { created_at: attachment.created_at })
                }))
            }),
            ...(ticket.cc_emails != null && { cc_emails: ticket.cc_emails }),
            ...(ticket.company_id != null && { company_id: ticket.company_id }),
            ...(ticket.created_at != null && { created_at: ticket.created_at }),
            ...(ticket.custom_fields != null && { custom_fields: ticket.custom_fields }),
            ...(ticket.deleted != null && { deleted: ticket.deleted }),
            ...(ticket.description != null && { description: ticket.description }),
            ...(ticket.description_text != null && { description_text: ticket.description_text }),
            ...(ticket.due_by != null && { due_by: ticket.due_by }),
            ...(ticket.email != null && { email: ticket.email }),
            ...(ticket.email_config_id != null && { email_config_id: ticket.email_config_id }),
            ...(ticket.facebook_id != null && { facebook_id: ticket.facebook_id }),
            ...(ticket.fr_due_by != null && { fr_due_by: ticket.fr_due_by }),
            ...(ticket.fr_escalated != null && { fr_escalated: ticket.fr_escalated }),
            ...(ticket.fwd_emails != null && { fwd_emails: ticket.fwd_emails }),
            ...(ticket.group_id != null && { group_id: ticket.group_id }),
            ...(ticket.is_escalated != null && { is_escalated: ticket.is_escalated }),
            ...(ticket.name != null && { name: ticket.name }),
            ...(ticket.phone != null && { phone: ticket.phone }),
            ...(ticket.priority != null && { priority: ticket.priority }),
            ...(ticket.product_id != null && { product_id: ticket.product_id }),
            ...(ticket.reply_cc_emails != null && { reply_cc_emails: ticket.reply_cc_emails }),
            ...(ticket.requester_id != null && { requester_id: ticket.requester_id }),
            ...(ticket.responder_id != null && { responder_id: ticket.responder_id }),
            ...(ticket.source != null && { source: ticket.source }),
            ...(ticket.source_info != null && { source_info: ticket.source_info }),
            ...(ticket.spam != null && { spam: ticket.spam }),
            ...(ticket.status != null && { status: ticket.status }),
            ...(ticket.subject != null && { subject: ticket.subject }),
            ...(ticket.tags != null && { tags: ticket.tags }),
            ...(ticket.to_emails != null && { to_emails: ticket.to_emails }),
            ...(ticket.twitter_id != null && { twitter_id: ticket.twitter_id }),
            ...(ticket.type != null && { type: ticket.type }),
            ...(ticket.updated_at != null && { updated_at: ticket.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
