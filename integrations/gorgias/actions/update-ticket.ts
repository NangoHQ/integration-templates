import { z } from 'zod';
import { createAction } from 'nango';

const UpdateTicketTagInputSchema = z.object({
    name: z.string().describe('Name of the tag. Tags are case-sensitive and must already exist in the account.'),
    decoration: z
        .object({
            color: z.string().optional().describe('Hex color code for the tag. Example: "#F58D86".')
        })
        .optional()
        .describe('Optional styling information for the tag.')
});

const UpdateTicketCustomFieldInputSchema = z.object({
    id: z.number().describe('ID of the custom field definition.'),
    value: z.unknown().describe('Value to set for the custom field.')
});

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the ticket to update. Example: 82682724'),
        subject: z.string().optional().describe('The new subject line for the ticket.'),
        status: z.string().optional().describe('Ticket status. Examples: "open", "closed".'),
        priority: z.string().optional().describe('Ticket priority. Examples: "low", "normal", "high", "critical".'),
        assignee_user_id: z.number().optional().describe('ID of the user to assign the ticket to.'),
        assignee_team_id: z.number().optional().describe('ID of the team to assign the ticket to.'),
        channel: z.string().optional().describe('Communication channel for the ticket. Examples: "email", "phone", "chat", "sms".'),
        via: z.string().optional().describe('How the ticket was received or sent. Examples: "api", "email", "web".'),
        from_agent: z.boolean().optional().describe('Whether the first message was sent by the company to the customer.'),
        is_unread: z.boolean().optional().describe('Mark the ticket as read or unread.'),
        spam: z.boolean().optional().describe('Whether the ticket is considered spam.'),
        language: z.string().optional().describe('Language primarily used in the ticket. Example: "en".'),
        external_id: z.string().optional().describe('External reference ID in a foreign system. Max 255 characters.'),
        tags: z.array(UpdateTicketTagInputSchema).optional().describe('Tags to attach to the ticket. Replaces the existing tag list.'),
        custom_fields: z.array(UpdateTicketCustomFieldInputSchema).optional().describe('Custom field values to set on the ticket.'),
        customer_id: z.number().optional().describe('ID of the customer to associate with the ticket.'),
        meta: z.record(z.string(), z.unknown()).optional().describe('Metadata to associate with the ticket. Key-value data.'),
        closed_datetime: z.string().nullable().optional().describe('ISO 8601 timestamp when the ticket was closed.'),
        trashed_datetime: z.string().nullable().optional().describe('ISO 8601 datetime to move the ticket to trash. Pass null to restore.'),
        snooze_datetime: z.string().nullable().optional().describe('ISO 8601 timestamp when the ticket will be re-opened automatically.'),
        opened_datetime: z.string().optional().describe('ISO 8601 timestamp when the ticket was opened.'),
        last_message_datetime: z.string().optional().describe('ISO 8601 timestamp when the last message was sent.'),
        last_received_message_datetime: z.string().optional().describe('ISO 8601 timestamp when the last customer message was received.')
    })
    .describe('Input to update a ticket including its subject, status, priority, assignee, tags, and custom fields.');

const TicketTagSchema = z.object({
    id: z.number().describe('ID of the tag.'),
    name: z.string().describe('Name of the tag.'),
    decoration: z
        .object({
            color: z.string().optional().describe('Hex color code for the tag. Example: "#F58D86".')
        })
        .optional()
        .describe('Styling information for the tag.')
});

const TicketUserSchema = z.object({
    id: z.number().describe('ID of the user.'),
    email: z.string().nullable().describe('Email address of the user.'),
    name: z.string().nullable().describe('Full name of the user.'),
    firstname: z.string().nullable().describe('First name of the user.'),
    lastname: z.string().nullable().describe('Last name of the user.')
});

const TicketCustomerSchema = z
    .object({
        id: z.number().describe('ID of the customer.'),
        email: z.string().nullable().describe('Email address of the customer.'),
        name: z.string().nullable().describe('Full name of the customer.'),
        firstname: z.string().nullable().describe('First name of the customer.'),
        lastname: z.string().nullable().describe('Last name of the customer.')
    })
    .passthrough();

const TicketCustomFieldValueSchema = z.object({
    id: z.number().optional().describe('ID of the custom field value.'),
    value: z.unknown().optional().describe('Value of the custom field.'),
    prediction: z.unknown().optional().describe('Prediction metadata for the custom field.')
});

const TicketMessageSchema = z
    .object({
        id: z.number().describe('ID of the message.'),
        uri: z.string().describe('URI of the message.'),
        ticket_id: z.number().describe('ID of the associated ticket.'),
        channel: z.string().describe('Channel used for the message.'),
        via: z.string().describe('How the message was received or sent.'),
        subject: z.string().nullable().describe('Subject of the message.'),
        body_text: z.string().describe('Full text body of the message.'),
        body_html: z.string().nullable().describe('Full HTML body of the message.'),
        created_datetime: z.string().describe('ISO 8601 timestamp when the message was created.'),
        public: z.boolean().optional().describe('Whether the message is public.')
    })
    .passthrough();

const TicketSchema = z
    .object({
        id: z.number().describe('ID of the ticket.'),
        uri: z.string().describe('API URI for the ticket.'),
        external_id: z.string().nullable().describe('External reference ID.'),
        status: z.string().describe('Current ticket status.'),
        priority: z.string().nullable().optional().describe('Current ticket priority.'),
        channel: z.string().describe('Communication channel.'),
        via: z.string().describe('How the ticket was received or sent.'),
        from_agent: z.boolean().describe('Whether the first message was sent by the company.'),
        spam: z.boolean().describe('Whether the ticket is marked as spam.'),
        imported: z.boolean().describe('Whether the ticket was created by a historical import.'),
        subject: z.string().describe('Subject of the ticket.'),
        language: z.string().describe('Language code for the ticket.'),
        is_unread: z.boolean().describe('Whether the ticket has unread messages.'),
        tags: z.array(TicketTagSchema).describe('Tags attached to the ticket.'),
        assignee_user: TicketUserSchema.nullable().describe('The agent assigned to the ticket.'),
        customer: TicketCustomerSchema.nullable().describe('The customer linked to the ticket.'),
        custom_fields: z.record(z.string(), TicketCustomFieldValueSchema).nullable().describe('Custom field values associated with the ticket.'),
        messages: z.array(TicketMessageSchema).describe('Messages in the ticket.'),
        events: z.array(z.unknown()).describe('Deprecated events associated with the ticket.'),
        meta: z.record(z.string(), z.unknown()).nullable().describe('Metadata associated with the ticket.'),
        summary: z.unknown().nullable().describe('AI summary of the ticket.'),
        satisfaction_survey: z.unknown().nullable().describe('Satisfaction survey linked to the ticket.'),
        reply_options: z.record(z.string(), z.unknown()).describe('Reply options for the ticket.'),
        created_datetime: z.string().describe('ISO 8601 timestamp when the ticket was created.'),
        updated_datetime: z.string().describe('ISO 8601 timestamp when the ticket was last updated.'),
        processed_datetime: z.string().describe('ISO 8601 timestamp when the ticket was processed by Gorgias.'),
        opened_datetime: z.string().nullable().describe('ISO 8601 timestamp when the ticket was first opened.'),
        closed_datetime: z.string().nullable().describe('ISO 8601 timestamp when the ticket was closed.'),
        trashed_datetime: z.string().nullable().describe('ISO 8601 timestamp when the ticket was moved to trash.'),
        snooze_datetime: z.string().nullable().describe('ISO 8601 timestamp when the ticket will be re-opened.'),
        last_received_message_datetime: z.string().nullable().describe('ISO 8601 timestamp when the last customer message was received.'),
        last_message_datetime: z.string().nullable().describe('ISO 8601 timestamp when the last message was sent.')
    })
    .describe('The updated ticket returned by the API with all its fields and nested messages.');

/**
 * @tags: [write]
 * @tagReason: Updates ticket properties on the provider via a PUT request.
 * @pitfalls: The `custom_fields` input is an array of `{ id, value }` objects, but the response returns them as a dictionary keyed by custom field ID strings.
 */
const action = createAction({
    description: "Update a ticket's fields (subject, status, priority, assignee, tags, channel, custom fields, etc.).",
    version: '1.0.0',
    input: InputSchema,
    output: TicketSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<z.infer<typeof TicketSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.subject !== undefined) {
            updateData['subject'] = input.subject;
        }
        if (input.status !== undefined) {
            updateData['status'] = input.status;
        }
        if (input.priority !== undefined) {
            updateData['priority'] = input.priority;
        }
        if (input.assignee_user_id !== undefined) {
            updateData['assignee_user'] = { id: input.assignee_user_id };
        }
        if (input.assignee_team_id !== undefined) {
            updateData['assignee_team'] = { id: input.assignee_team_id };
        }
        if (input.channel !== undefined) {
            updateData['channel'] = input.channel;
        }
        if (input.via !== undefined) {
            updateData['via'] = input.via;
        }
        if (input.from_agent !== undefined) {
            updateData['from_agent'] = input.from_agent;
        }
        if (input.is_unread !== undefined) {
            updateData['is_unread'] = input.is_unread;
        }
        if (input.spam !== undefined) {
            updateData['spam'] = input.spam;
        }
        if (input.language !== undefined) {
            updateData['language'] = input.language;
        }
        if (input.external_id !== undefined) {
            updateData['external_id'] = input.external_id;
        }
        if (input.tags !== undefined) {
            updateData['tags'] = input.tags;
        }
        if (input.custom_fields !== undefined) {
            updateData['custom_fields'] = input.custom_fields;
        }
        if (input.customer_id !== undefined) {
            updateData['customer'] = { id: input.customer_id };
        }
        if (input.meta !== undefined) {
            updateData['meta'] = input.meta;
        }
        if (input.closed_datetime !== undefined) {
            updateData['closed_datetime'] = input.closed_datetime;
        }
        if (input.trashed_datetime !== undefined) {
            updateData['trashed_datetime'] = input.trashed_datetime;
        }
        if (input.snooze_datetime !== undefined) {
            updateData['snooze_datetime'] = input.snooze_datetime;
        }
        if (input.opened_datetime !== undefined) {
            updateData['opened_datetime'] = input.opened_datetime;
        }
        if (input.last_message_datetime !== undefined) {
            updateData['last_message_datetime'] = input.last_message_datetime;
        }
        if (input.last_received_message_datetime !== undefined) {
            updateData['last_received_message_datetime'] = input.last_received_message_datetime;
        }

        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-ticket
            endpoint: `/api/tickets/${encodeURIComponent(String(input.id))}`,
            data: updateData,
            retries: 3
        });

        if (response.data === null || response.data === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ticket not found or update failed',
                ticket_id: input.id
            });
        }

        const ticket = TicketSchema.parse(response.data);
        return ticket;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
