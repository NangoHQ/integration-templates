import type { NangoSync, Ticket, ProxyConfiguration } from '../../models.js';
import type { FreshdeskTicket } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://developer.freshdesk.com/api/#list_all_tickets
        endpoint: '/api/v2/tickets',
        retries: 10,
        paginate: {
            type: 'link',
            limit_name_in_request: 'per_page',
            link_rel_in_response_header: 'next'
        }
    };

    if (nango.lastSyncDate) {
        config.params = {
            updated_since: nango.lastSyncDate.toISOString()
        };
    }

    for await (const fTickets of nango.paginate<FreshdeskTicket>(config)) {
        const tickets: Ticket[] = fTickets.map((fTicket: FreshdeskTicket) => {
            return {
                id: fTicket.id.toString(),
                type: fTicket.type,
                priority: fTicket.priority,
                request_id: fTicket.requester_id,
                response_id: fTicket.responder_id,
                source: fTicket.source,
                subject: fTicket.subject,
                to_emails: fTicket.to_emails,
                created_at: fTicket.created_at,
                updated_at: fTicket.updated_at,
                is_escalated: fTicket.is_escalated
            };
        });

        await nango.batchSave(tickets, 'Ticket');
    }
}
