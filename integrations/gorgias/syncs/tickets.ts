import type { NangoSync, Ticket, ProxyConfiguration } from '../../models';
import type { GorgiasTicketResponse } from '../types';
import { toTicket } from '../mappers/to-ticket.js';

/**
 * Fetches and processes Gorgias tickets and their associated messages data.
 * The function uses pagination to fetch tickets in batches and messages for each ticket.
 *
 * For endpoint documentation, refer to:
 * https://developers.gorgias.com/reference/list-tickets
 * @param {NangoSync} nango - The NangoSync instance for handling synchronization tasks.
 */

export default async function fetchData(nango: NangoSync) {
    const ticketsConfig: ProxyConfiguration = {
        // https://developers.gorgias.com/reference/list-tickets
        endpoint: '/api/tickets',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'meta.next_cursor',
            cursor_name_in_request: 'cursor',
            response_path: 'data',
            limit: 100,
            limit_name_in_request: 'limit'
        },
        retries: 10
    };

    // Iterate through the paginated tickets to get specific ticket
    for await (const tickets of nango.paginate<GorgiasTicketResponse>(ticketsConfig)) {
        const processedTickets: Ticket[] = [];
        for (const ticket of tickets) {
            const ticketConfig: ProxyConfiguration = {
                // https://developers.gorgias.com/reference/get-ticket
                endpoint: `/api/tickets/${ticket.id}`,
                retries: 10
            };

            const specificTicket = await nango.get<GorgiasTicketResponse>(ticketConfig);

            const ticketToSave = toTicket(ticket, specificTicket.data.messages);
            processedTickets.push(ticketToSave);
        }
        await nango.batchSave<Ticket>(processedTickets, 'Ticket');
    }
}
