import type { ZendeskUser, ZendeskTicket } from '../types.js';
import type { SearchTicket } from ../models.js;

export function toTicket(ticket: ZendeskTicket, users: ZendeskUser[]): SearchTicket {
    const requester = users.find((user) => user.id === ticket.requester_id);
    const assignee = users.find((user) => user.id === ticket.assignee_id);

    if (!requester) {
        throw new Error(`Requester with ID ${ticket.requester_id} not found`);
    }

    return {
        id: ticket.id.toString(),
        url: ticket.url,
        external_id: ticket.external_id,
        requester_id: requester.id.toString(),
        requester_name: requester.name,
        assignee_id: assignee ? assignee.id.toString() : null,
        assignee_name: assignee ? assignee.name : null,
        assignee_avatar: assignee && assignee.photo ? assignee.photo.content_url : null,
        status: ticket.status,
        created_at: new Date(ticket.created_at).toISOString(),
        updated_at: new Date(ticket.updated_at).toISOString(),
        is_public: ticket.is_public,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        tags: ticket.tags
    };
}
