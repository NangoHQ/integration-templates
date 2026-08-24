import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Ticket ID to update. Example: 123'),
        name: z.string().optional().describe('Name of the requester. Used to create a new contact if one does not exist.'),
        requester_id: z.number().optional().describe('User ID of the requester. Pass this instead of email for existing contacts.'),
        email: z.string().optional().describe('Email address of the requester. A new contact will be created if none exists with this email.'),
        phone: z.string().optional().describe('Phone number of the requester. If set without an email, name is mandatory.'),
        twitter_id: z.string().optional().describe('Twitter handle of the requester. A new contact will be created if none exists with this handle.'),
        unique_external_id: z.string().optional().describe('External ID of the requester. A new contact will be created if none exists with this external ID.'),
        subject: z.string().optional().describe('Subject of the ticket.'),
        type: z.string().optional().describe('Ticket type used to categorize issues. Example: "Question" or "Incident".'),
        status: z.number().optional().describe('Status of the ticket. Values: 2=Open, 3=Pending, 4=Resolved, 5=Closed.'),
        priority: z.number().optional().describe('Priority of the ticket. Values: 1=Low, 2=Medium, 3=High, 4=Urgent.'),
        description: z.string().optional().describe('HTML content of the ticket description.'),
        responder_id: z.number().optional().describe('ID of the agent to whom the ticket should be assigned.'),
        group_id: z.number().optional().describe('ID of the group to which the ticket should be assigned.'),
        product_id: z.number().optional().describe('ID of the product associated with the ticket. Ignored if email_config_id is set.'),
        company_id: z.number().optional().describe('ID of the company associated with the ticket. Requires Multiple Companies feature.'),
        email_config_id: z.number().optional().describe('ID of the email config used for this ticket. Product primary config is used when omitted.'),
        source: z
            .number()
            .optional()
            .describe('Channel through which the ticket was created. Values: 1=Email, 2=Portal, 3=Phone, 7=Chat, 9=Feedback Widget, 10=Outbound Email.'),
        tags: z.array(z.string()).optional().describe('Tags to associate with the ticket.'),
        cc_emails: z.array(z.string()).optional().describe('Email addresses added in the CC field of the incoming ticket email.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Key-value pairs of custom field names and values.'),
        due_by: z.string().optional().describe('ISO 8601 timestamp when ticket resolution is due.'),
        fr_due_by: z.string().optional().describe('ISO 8601 timestamp when the first response is due.')
    })
    .describe('Input to update an existing Freshdesk ticket.');

const ProviderTicketSchema = z.object({
    id: z.number(),
    subject: z.string().nullable(),
    description: z.string().nullable(),
    description_text: z.string().nullable(),
    status: z.number(),
    priority: z.number(),
    source: z.number(),
    type: z.string().nullable(),
    requester_id: z.number(),
    responder_id: z.number().nullable(),
    group_id: z.number().nullable(),
    product_id: z.number().nullable(),
    company_id: z.number().nullable(),
    email_config_id: z.number().nullable(),
    cc_emails: z.array(z.string()).nullable(),
    reply_cc_emails: z.array(z.string()).nullable(),
    tags: z.array(z.string()).nullable(),
    custom_fields: z.record(z.string(), z.unknown()).nullable(),
    due_by: z.string().nullable(),
    fr_due_by: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    spam: z.boolean().nullable(),
    fr_escalated: z.boolean().nullable(),
    is_escalated: z.boolean().nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the ticket.'),
        subject: z.string().optional().describe('Subject of the ticket.'),
        description: z.string().optional().describe('HTML content of the ticket description.'),
        description_text: z.string().optional().describe('Plain-text version of the ticket description.'),
        status: z.number().describe('Status of the ticket. Values: 2=Open, 3=Pending, 4=Resolved, 5=Closed.'),
        priority: z.number().describe('Priority of the ticket. Values: 1=Low, 2=Medium, 3=High, 4=Urgent.'),
        source: z.number().describe('Channel through which the ticket was created.'),
        type: z.string().optional().describe('Ticket type used to categorize issues.'),
        requester_id: z.number().describe('User ID of the requester.'),
        responder_id: z.number().optional().describe('ID of the assigned agent.'),
        group_id: z.number().optional().describe('ID of the assigned group.'),
        product_id: z.number().optional().describe('ID of the associated product.'),
        company_id: z.number().optional().describe('ID of the associated company.'),
        email_config_id: z.number().optional().describe('ID of the email configuration used for this ticket.'),
        cc_emails: z.array(z.string()).optional().describe('Email addresses in the CC field.'),
        reply_cc_emails: z.array(z.string()).optional().describe('Email addresses CCd on replies.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the ticket.'),
        custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom field values on the ticket.'),
        due_by: z.string().optional().describe('Timestamp when ticket resolution is due.'),
        fr_due_by: z.string().optional().describe('Timestamp when the first response is due.'),
        created_at: z.string().describe('Timestamp when the ticket was created.'),
        updated_at: z.string().describe('Timestamp when the ticket was last updated.'),
        spam: z.boolean().optional().describe('Whether the ticket has been marked as spam.'),
        fr_escalated: z.boolean().optional().describe('Whether the ticket was escalated for first-response SLA breach.'),
        is_escalated: z.boolean().optional().describe('Whether the ticket has been escalated.')
    })
    .describe('The updated Freshdesk ticket.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing ticket on the provider by updating its fields.
 * @pitfalls: Updating a spam or deleted ticket returns 405; outbound tickets cannot have subject or description updated.
 */
const action = createAction({
    description: 'Update a ticket in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.requester_id !== undefined) {
            data['requester_id'] = input.requester_id;
        }
        if (input.email !== undefined) {
            data['email'] = input.email;
        }
        if (input.phone !== undefined) {
            data['phone'] = input.phone;
        }
        if (input.twitter_id !== undefined) {
            data['twitter_id'] = input.twitter_id;
        }
        if (input.unique_external_id !== undefined) {
            data['unique_external_id'] = input.unique_external_id;
        }
        if (input.subject !== undefined) {
            data['subject'] = input.subject;
        }
        if (input.type !== undefined) {
            data['type'] = input.type;
        }
        if (input.status !== undefined) {
            data['status'] = input.status;
        }
        if (input.priority !== undefined) {
            data['priority'] = input.priority;
        }
        if (input.description !== undefined) {
            data['description'] = input.description;
        }
        if (input.responder_id !== undefined) {
            data['responder_id'] = input.responder_id;
        }
        if (input.group_id !== undefined) {
            data['group_id'] = input.group_id;
        }
        if (input.product_id !== undefined) {
            data['product_id'] = input.product_id;
        }
        if (input.company_id !== undefined) {
            data['company_id'] = input.company_id;
        }
        if (input.email_config_id !== undefined) {
            data['email_config_id'] = input.email_config_id;
        }
        if (input.source !== undefined) {
            data['source'] = input.source;
        }
        if (input.tags !== undefined) {
            data['tags'] = input.tags;
        }
        if (input.cc_emails !== undefined) {
            data['cc_emails'] = input.cc_emails;
        }
        if (input.custom_fields !== undefined) {
            data['custom_fields'] = input.custom_fields;
        }
        if (input.due_by !== undefined) {
            data['due_by'] = input.due_by;
        }
        if (input.fr_due_by !== undefined) {
            data['fr_due_by'] = input.fr_due_by;
        }

        // https://developers.freshdesk.com/api/#update_ticket
        const response = await nango.patch({
            endpoint: `/api/v2/tickets/${encodeURIComponent(String(input.id))}`,
            data,
            retries: 10
        });

        const providerTicket = ProviderTicketSchema.parse(response.data);

        return {
            id: providerTicket.id,
            ...(providerTicket.subject != null && { subject: providerTicket.subject }),
            ...(providerTicket.description != null && { description: providerTicket.description }),
            ...(providerTicket.description_text != null && { description_text: providerTicket.description_text }),
            status: providerTicket.status,
            priority: providerTicket.priority,
            source: providerTicket.source,
            ...(providerTicket.type != null && { type: providerTicket.type }),
            requester_id: providerTicket.requester_id,
            ...(providerTicket.responder_id != null && { responder_id: providerTicket.responder_id }),
            ...(providerTicket.group_id != null && { group_id: providerTicket.group_id }),
            ...(providerTicket.product_id != null && { product_id: providerTicket.product_id }),
            ...(providerTicket.company_id != null && { company_id: providerTicket.company_id }),
            ...(providerTicket.email_config_id != null && { email_config_id: providerTicket.email_config_id }),
            ...(providerTicket.cc_emails != null && { cc_emails: providerTicket.cc_emails }),
            ...(providerTicket.reply_cc_emails != null && { reply_cc_emails: providerTicket.reply_cc_emails }),
            ...(providerTicket.tags != null && { tags: providerTicket.tags }),
            ...(providerTicket.custom_fields != null && { custom_fields: providerTicket.custom_fields }),
            ...(providerTicket.due_by != null && { due_by: providerTicket.due_by }),
            ...(providerTicket.fr_due_by != null && { fr_due_by: providerTicket.fr_due_by }),
            created_at: providerTicket.created_at,
            updated_at: providerTicket.updated_at,
            ...(providerTicket.spam != null && { spam: providerTicket.spam }),
            ...(providerTicket.fr_escalated != null && { fr_escalated: providerTicket.fr_escalated }),
            ...(providerTicket.is_escalated != null && { is_escalated: providerTicket.is_escalated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
