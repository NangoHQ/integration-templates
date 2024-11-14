import type { GorgiasTicketResponse, GorgiasMessageResponse, GorgiasAttachementResponse } from '../types';
import type { Ticket, Message, Attachment } from '../../models';

export function toTickets(ticketResponse: GorgiasTicketResponse, messages: GorgiasMessageResponse[]): Ticket {
    const ticket: Ticket = {
        id: ticketResponse.id,
        assignee_user: ticketResponse.assignee_user,
        channel: ticketResponse.channel,
        closed_datetime: ticketResponse.closed_datetime,
        created_datetime: ticketResponse.created_datetime,
        excerpt: ticketResponse.excerpt,
        external_id: ticketResponse.external_id,
        from_agent: ticketResponse.from_agent,
        integrations: ticketResponse.integrations,
        is_unread: ticketResponse.is_unread,
        language: ticketResponse.language,
        last_message_datetime: ticketResponse.last_message_datetime,
        last_received_message_datetime: ticketResponse.last_received_message_datetime,
        messages_count: ticketResponse.messages_count,
        messages: messages.map((message) => toMessage(message)),
        meta: ticketResponse.meta,
        opened_datetime: ticketResponse.opened_datetime,
        snooze_datetime: ticketResponse.snooze_datetime,
        status: ticketResponse.status,
        subject: ticketResponse.subject,
        tags: ticketResponse.tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            uri: tag.uri ?? null,
            decoration: tag.decoration ?? null,
            created_datetime: tag.created_datetime ?? null,
            deleted_datetime: tag.deleted_datetime ?? null
        })),
        spam: ticketResponse.spam,
        trashed_datetime: ticketResponse.trashed_datetime,
        updated_datetime: ticketResponse.updated_datetime,
        via: ticketResponse.via,
        uri: ticketResponse.uri
    };

    return ticket;
}

function toMessage(message: GorgiasMessageResponse): Message {
    return {
        id: message.id,
        uri: message.uri,
        message_id: message.message_id,
        integration_id: message.integration_id,
        rule_id: message.rule_id,
        external_id: message.external_id,
        ticket_id: message.ticket_id,
        channel: message.channel,
        via: message.via,
        subject: message.subject,
        body_text: message.body_text,
        body_html: message.body_html,
        stripped_text: message.stripped_text,
        stripped_html: message.stripped_html,
        stripped_signature: message.stripped_signature,
        public: message.public,
        from_agent: message.from_agent,
        sender: message.sender,
        receiver: message.receiver,
        attachments: (message.attachments ?? []).map((attachment: GorgiasAttachementResponse) => toAttachment(attachment)),
        meta: message.meta,
        headers: message.headers ?? null,
        actions: message.actions,
        macros: message.macros ?? null,
        created_datetime: message.created_datetime,
        opened_datetime: message.opened_datetime,
        failed_datetime: message.failed_datetime,
        deleted_datetime: message.deleted_datetime ?? null,
        replied_by: message.replied_by ?? null,
        replied_to: message.replied_to ?? null,
        last_sending_error: message.last_sending_error
    };
}

function toAttachment(attachment: GorgiasAttachementResponse): Attachment {
    return {
        url: attachment.url,
        name: attachment.name,
        size: attachment.size,
        content_type: attachment.content_type,
        public: attachment.public,
        extra: attachment.extra
    };
}
