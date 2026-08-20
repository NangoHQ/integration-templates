import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        name: z.string().optional().describe('Name of the requester.'),
        requester_id: z
            .number()
            .optional()
            .describe("User ID of the requester. For existing contacts, the requester_id can be passed instead of the requester's email."),
        email: z
            .string()
            .optional()
            .describe('Email address of the requester. If no contact exists with this email address in Freshdesk, it will be added as a new contact.'),
        facebook_id: z.string().optional().describe('Facebook ID of the requester. A contact should exist with this facebook_id in Freshdesk.'),
        phone: z
            .string()
            .optional()
            .describe('Phone number of the requester. If no contact exists with this phone number in Freshdesk, it will be added as a new contact.'),
        mobile: z
            .string()
            .optional()
            .describe('Mobile number of the requester. If no contact exists with this mobile number in Freshdesk, it will be added as a new contact.'),
        twitter_id: z
            .string()
            .optional()
            .describe('Twitter handle of the requester. If no contact exists with this handle in Freshdesk, it will be added as a new contact.'),
        unique_external_id: z
            .string()
            .optional()
            .describe('External ID of the requester. If no contact exists with this external ID in Freshdesk, they will be added as a new contact.'),
        subject: z.string().optional().describe('Subject of the ticket.'),
        type: z.string().optional().describe('Helps categorize the ticket according to the different kinds of issues your support team deals with.'),
        status: z.number().optional().describe('Status of the ticket. Default is 2 (Open).'),
        priority: z.number().optional().describe('Priority of the ticket. Default is 1 (Low).'),
        description: z.string().optional().describe('HTML content of the ticket.'),
        responder_id: z.number().optional().describe('ID of the agent to whom the ticket has been assigned.'),
        cc_emails: z.array(z.string()).optional().describe('Email addresses added in the cc field of the incoming ticket email.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key value pairs containing the names and values of custom fields.'),
        due_by: z.string().optional().describe('Timestamp when the ticket is due for response. Set within a few seconds of ticket creation unless provided.'),
        email_config_id: z.number().optional().describe('ID of email config which is used for this ticket.'),
        fr_due_by: z.string().optional().describe('Timestamp for the first response due by. Set within a few seconds of ticket creation unless provided.'),
        group_id: z.number().optional().describe('ID of the group to which the ticket has been assigned.'),
        parent_id: z
            .number()
            .optional()
            .describe('ID of the parent ticket that this ticket should be linked to. When passed, the current ticket will be converted to a child ticket.'),
        product_id: z.number().optional().describe('ID of the product to which the ticket is associated. Ignored if email_config_id is set.'),
        source: z.number().optional().describe('The channel through which the ticket was created. Default is 2 (Portal).'),
        tags: z.array(z.string()).optional().describe('Tags that have been associated with the ticket.'),
        company_id: z.number().optional().describe('Company ID of the requester. Only settable if the Multiple Companies feature is enabled.'),
        internal_agent_id: z.number().optional().describe('ID of the internal agent which the ticket should be assigned with.'),
        internal_group_id: z.number().optional().describe('ID of the internal group to which the ticket should be assigned with.'),
        lookup_parameter: z
            .string()
            .optional()
            .describe(
                'Attribute for tickets when Custom Objects is enabled and a lookup field has been added under ticket fields. Default value is display_id.'
            )
    })
    .describe('Input to create a ticket in Freshdesk.')
    .refine(
        (data) => data.requester_id || data.email || data.facebook_id || data.phone || data.mobile || data.twitter_id || data.unique_external_id,
        {
            message: 'At least one of requester_id, email, facebook_id, phone, mobile, twitter_id, or unique_external_id is required.'
        }
    );

const ProviderAttachmentSchema = z.object({
    id: z.number(),
    content_type: z.string(),
    file_size: z.number(),
    name: z.string(),
    attachment_url: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderTicketSchema = z.object({
    cc_emails: z.array(z.string()).nullable().optional(),
    fwd_emails: z.array(z.string()).nullable().optional(),
    reply_cc_emails: z.array(z.string()).nullable().optional(),
    email_config_id: z.number().nullable().optional(),
    group_id: z.number().nullable().optional(),
    priority: z.number(),
    requester_id: z.number(),
    responder_id: z.number().nullable().optional(),
    source: z.number(),
    status: z.number(),
    subject: z.string().nullable().optional(),
    company_id: z.number().nullable().optional(),
    id: z.number(),
    type: z.string().nullable().optional(),
    to_emails: z.array(z.string()).nullable().optional(),
    product_id: z.number().nullable().optional(),
    fr_escalated: z.boolean().optional(),
    spam: z.boolean().optional(),
    urgent: z.boolean().optional(),
    is_escalated: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    due_by: z.string().nullable().optional(),
    fr_due_by: z.string().nullable().optional(),
    description_text: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    attachments: z.array(ProviderAttachmentSchema).nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the created ticket.'),
        cc_emails: z.array(z.string()).optional().describe('Email addresses in the cc field.'),
        fwd_emails: z.array(z.string()).optional().describe('Email addresses in the fwd field.'),
        reply_cc_emails: z.array(z.string()).optional().describe('Email addresses in the reply cc field.'),
        email_config_id: z.number().optional().describe('ID of the email config used for this ticket.'),
        group_id: z.number().optional().describe('ID of the group to which the ticket is assigned.'),
        priority: z.number().describe('Priority of the ticket. 1=Low, 2=Medium, 3=High, 4=Urgent.'),
        requester_id: z.number().describe('User ID of the requester.'),
        responder_id: z.number().optional().describe('ID of the assigned agent.'),
        source: z.number().describe('Channel through which the ticket was created. 1=Email, 2=Portal, 3=Phone, 7=Chat, 9=Feedback Widget, 10=Outbound Email.'),
        status: z.number().describe('Status of the ticket. 2=Open, 3=Pending, 4=Resolved, 5=Closed.'),
        subject: z.string().optional().describe('Subject of the ticket.'),
        company_id: z.number().optional().describe('Company ID of the requester.'),
        type: z.string().optional().describe('Type of ticket, e.g. Question or Incident.'),
        to_emails: z.array(z.string()).optional().describe('Recipient email addresses for the ticket.'),
        product_id: z.number().optional().describe('ID of the associated product.'),
        fr_escalated: z.boolean().optional().describe('Whether the first response has been escalated.'),
        spam: z.boolean().optional().describe('Whether the ticket is marked as spam.'),
        urgent: z.boolean().optional().describe('Whether the ticket is marked as urgent.'),
        is_escalated: z.boolean().optional().describe('Whether the ticket is currently escalated.'),
        created_at: z.string().describe('Timestamp when the ticket was created.'),
        updated_at: z.string().describe('Timestamp when the ticket was last updated.'),
        due_by: z.string().optional().describe('Timestamp when the ticket is due for response.'),
        fr_due_by: z.string().optional().describe('Timestamp for the first response due by.'),
        description_text: z.string().optional().describe('Plain text version of the ticket description.'),
        description: z.string().optional().describe('HTML content of the ticket description.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the ticket.'),
        attachments: z
            .array(
                z.object({
                    id: z.number().describe('Attachment ID.'),
                    content_type: z.string().describe('MIME type of the attachment.'),
                    file_size: z.number().describe('Size of the attachment in bytes.'),
                    name: z.string().describe('Filename of the attachment.'),
                    attachment_url: z.string().describe('URL to download the attachment.'),
                    created_at: z.string().describe('Timestamp when the attachment was created.'),
                    updated_at: z.string().describe('Timestamp when the attachment was last updated.')
                })
            )
            .optional()
            .describe('Attachments associated with the ticket.')
    })
    .describe('The created Freshdesk ticket.');

/**
 * @tags: [write]
 * @tagReason: Creates a new ticket in Freshdesk.
 * @pitfalls: All requester identifiers appear optional but at least one is required; an unknown email, phone, or external id automatically creates a new contact.
 */
const action = createAction({
    description: 'Create a ticket in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#create_ticket
            endpoint: '/api/v2/tickets',
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.requester_id !== undefined && { requester_id: input.requester_id }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.facebook_id !== undefined && { facebook_id: input.facebook_id }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.mobile !== undefined && { mobile: input.mobile }),
                ...(input.twitter_id !== undefined && { twitter_id: input.twitter_id }),
                ...(input.unique_external_id !== undefined && { unique_external_id: input.unique_external_id }),
                ...(input.subject !== undefined && { subject: input.subject }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.responder_id !== undefined && { responder_id: input.responder_id }),
                ...(input.cc_emails !== undefined && { cc_emails: input.cc_emails }),
                ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields }),
                ...(input.due_by !== undefined && { due_by: input.due_by }),
                ...(input.email_config_id !== undefined && { email_config_id: input.email_config_id }),
                ...(input.fr_due_by !== undefined && { fr_due_by: input.fr_due_by }),
                ...(input.group_id !== undefined && { group_id: input.group_id }),
                ...(input.parent_id !== undefined && { parent_id: input.parent_id }),
                ...(input.product_id !== undefined && { product_id: input.product_id }),
                ...(input.source !== undefined && { source: input.source }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.company_id !== undefined && { company_id: input.company_id }),
                ...(input.internal_agent_id !== undefined && { internal_agent_id: input.internal_agent_id }),
                ...(input.internal_group_id !== undefined && { internal_group_id: input.internal_group_id }),
                ...(input.lookup_parameter !== undefined && { lookup_parameter: input.lookup_parameter })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Freshdesk did not return a ticket in the response.'
            });
        }

        const providerTicket = ProviderTicketSchema.parse(response.data);

        return {
            id: providerTicket.id,
            ...(providerTicket.cc_emails != null && { cc_emails: providerTicket.cc_emails }),
            ...(providerTicket.fwd_emails != null && { fwd_emails: providerTicket.fwd_emails }),
            ...(providerTicket.reply_cc_emails != null && { reply_cc_emails: providerTicket.reply_cc_emails }),
            ...(providerTicket.email_config_id != null && { email_config_id: providerTicket.email_config_id }),
            ...(providerTicket.group_id != null && { group_id: providerTicket.group_id }),
            priority: providerTicket.priority,
            requester_id: providerTicket.requester_id,
            ...(providerTicket.responder_id != null && { responder_id: providerTicket.responder_id }),
            source: providerTicket.source,
            status: providerTicket.status,
            ...(providerTicket.subject != null && { subject: providerTicket.subject }),
            ...(providerTicket.company_id != null && { company_id: providerTicket.company_id }),
            ...(providerTicket.type != null && { type: providerTicket.type }),
            ...(providerTicket.to_emails != null && { to_emails: providerTicket.to_emails }),
            ...(providerTicket.product_id != null && { product_id: providerTicket.product_id }),
            ...(providerTicket.fr_escalated != null && { fr_escalated: providerTicket.fr_escalated }),
            ...(providerTicket.spam != null && { spam: providerTicket.spam }),
            ...(providerTicket.urgent != null && { urgent: providerTicket.urgent }),
            ...(providerTicket.is_escalated != null && { is_escalated: providerTicket.is_escalated }),
            created_at: providerTicket.created_at,
            updated_at: providerTicket.updated_at,
            ...(providerTicket.due_by != null && { due_by: providerTicket.due_by }),
            ...(providerTicket.fr_due_by != null && { fr_due_by: providerTicket.fr_due_by }),
            ...(providerTicket.description_text != null && { description_text: providerTicket.description_text }),
            ...(providerTicket.description != null && { description: providerTicket.description }),
            ...(providerTicket.tags != null && { tags: providerTicket.tags }),
            ...(providerTicket.attachments != null && {
                attachments: providerTicket.attachments.map((a) => ({
                    id: a.id,
                    content_type: a.content_type,
                    file_size: a.file_size,
                    name: a.name,
                    attachment_url: a.attachment_url,
                    created_at: a.created_at,
                    updated_at: a.updated_at
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
